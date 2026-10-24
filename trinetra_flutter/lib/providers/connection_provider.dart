import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import '../core/constants/api_endpoints.dart';
import '../core/utils/formatters.dart';
import '../core/utils/logger.dart';
import '../data/services/api_service.dart';
import '../data/services/storage_service.dart';
import '../data/services/websocket_service.dart';

enum GatewayStatus {
  connecting,
  connected,
  reconnecting,
  offline,
  authRequired,
}

class ConnectionProvider extends ChangeNotifier {
  String _serverUrl = ApiEndpoints.defaultTailscaleUrl;
  GatewayStatus _status = GatewayStatus.connecting;
  bool _isTesting = false;
  int _latencyMs = 0;
  String _statusMessage = 'Initializing gateway connection...';
  int _retryCount = 0;
  Timer? _backoffTimer;
  Timer? _healthCheckTimer;
  static const int _maxBackoffSeconds = 60;
  bool _isDisposed = false;

  // Getters
  String get serverUrl => _serverUrl;
  GatewayStatus get status => _status;
  bool get isConnected => _status == GatewayStatus.connected;
  bool get isConnecting => _status == GatewayStatus.connecting;
  bool get isReconnecting => _status == GatewayStatus.reconnecting;
  bool get isOffline => _status == GatewayStatus.offline;
  bool get isAuthRequired => _status == GatewayStatus.authRequired;
  bool get isTesting => _isTesting;
  int get latencyMs => _latencyMs;
  String get statusMessage => _statusMessage;
  int get retryCount => _retryCount;

  String get statusLabel {
    switch (_status) {
      case GatewayStatus.connected:
        return 'CONNECTED';
      case GatewayStatus.connecting:
        return 'CONNECTING';
      case GatewayStatus.reconnecting:
        return 'RECONNECTING (${_retryCount})';
      case GatewayStatus.authRequired:
        return 'AUTH REQUIRED';
      case GatewayStatus.offline:
      default:
        return 'OFFLINE';
    }
  }

  Future<void> init() async {
    _status = GatewayStatus.connecting;
    _statusMessage = 'Restoring gateway configuration...';
    notifyListeners();

    // 1. Restore previous gateway configuration
    _serverUrl = await StorageService.getServerUrl();
    AppLogger.info('ConnectionProvider initialized with server URL: $_serverUrl');

    // 2. Listen to WebSocket connection state changes
    WebSocketService.addStateListener((wsConnected, wsStatus) {
      if (_isDisposed) return;
      if (wsConnected && _status != GatewayStatus.connected) {
        _status = GatewayStatus.connected;
        _retryCount = 0;
        _statusMessage = 'Connected ($wsStatus)';
        notifyListeners();
      }
    });

    // 3. Test reachability and connect
    await _checkAndConnect(isInitial: true);

    // 4. Start periodic background liveness monitor (every 25s) with hysteresis
    _startHealthCheck();
  }

  int _consecutiveHealthCheckFailures = 0;

  void _startHealthCheck() {
    _healthCheckTimer?.cancel();
    _healthCheckTimer = Timer.periodic(const Duration(seconds: 25), (_) async {
      if (_isDisposed || _isTesting || _status == GatewayStatus.connecting) return;
      try {
        final res = await ApiService.pingEndpoint(_serverUrl, timeoutSec: 6);
        _consecutiveHealthCheckFailures = 0;
        if (_status != GatewayStatus.connected) {
          _status = GatewayStatus.connected;
          _retryCount = 0;
          _statusMessage = 'Online (${res['name'] ?? 'TRINETRA'})';
          notifyListeners();
          WebSocketService.connect();
        }
      } catch (e) {
        _consecutiveHealthCheckFailures++;
        AppLogger.warn('Health check ping failed ($_consecutiveHealthCheckFailures/3): $e');
        // Only trigger reconnection if 3 consecutive pings fail (75s of sustained unreachable state)
        if (_consecutiveHealthCheckFailures >= 3 && _status == GatewayStatus.connected) {
          _scheduleReconnection();
        }
      }
    });
  }

  // Called when the mobile app resumes from background / sleep
  Future<void> onAppResumed() async {
    AppLogger.info('App returned to foreground. Verifying gateway connection...');
    if (_status == GatewayStatus.connected) {
      try {
        await ApiService.pingEndpoint(_serverUrl, timeoutSec: 3);
        // Socket may have been suspended by Android kernel; verify WebSocket
        if (!WebSocketService.isConnected) {
          WebSocketService.connect();
        }
        return;
      } catch (_) {
        AppLogger.warn('Foreground ping failed; initiating reconnection.');
      }
    }
    await manualReconnect();
  }

  Future<bool> setServerUrl(String newUrl) async {
    final clean = Formatters.sanitizeUrl(newUrl);
    _serverUrl = clean;
    await StorageService.setServerUrl(clean);
    _retryCount = 0;
    _backoffTimer?.cancel();
    _status = GatewayStatus.connecting;
    _statusMessage = 'Connecting to $clean...';
    notifyListeners();

    // Reconnect socket and test
    WebSocketService.disconnect();
    return await _checkAndConnect(isInitial: false);
  }

  // Manual Reconnect fallback button handler
  Future<bool> manualReconnect() async {
    _backoffTimer?.cancel();
    _backoffTimer = null;
    _retryCount = 0;
    _status = GatewayStatus.connecting;
    _statusMessage = 'Reconnecting to gateway...';
    notifyListeners();

    WebSocketService.manualReconnect();
    return await _checkAndConnect(isInitial: false);
  }

  Future<bool> _checkAndConnect({bool isInitial = false}) async {
    if (_isTesting) return isConnected;
    _isTesting = true;
    notifyListeners();

    final stopwatch = Stopwatch()..start();
    bool reachabilitySuccess = false;

    try {
      final res = await ApiService.pingEndpoint(_serverUrl, timeoutSec: 6);
      stopwatch.stop();
      _latencyMs = stopwatch.elapsedMilliseconds;
      reachabilitySuccess = true;
      _status = GatewayStatus.connected;
      _retryCount = 0;
      _consecutiveHealthCheckFailures = 0;
      _statusMessage = 'Online (${res['name'] ?? 'TRINETRA'}) - ${_latencyMs}ms';
      AppLogger.info('Gateway reachable at $_serverUrl ($_latencyMs ms)');
      WebSocketService.connect();
    } on AuthExpiredException {
      stopwatch.stop();
      _latencyMs = stopwatch.elapsedMilliseconds;
      _status = GatewayStatus.authRequired;
      _statusMessage = 'Session expired. Authentication required.';
      AppLogger.warn('Authentication token expired.');
    } catch (e) {
      stopwatch.stop();
      _latencyMs = 0;
      AppLogger.warn('Primary gateway unreachable: $_serverUrl');

      // Fast parallel candidate discovery across Wi-Fi, Tunnel & Emulator
      final resolvedUrl = await _tryResolveCandidateEndpoint();
      if (resolvedUrl != null) {
        _serverUrl = resolvedUrl;
        await StorageService.setServerUrl(resolvedUrl);
        reachabilitySuccess = true;
        _status = GatewayStatus.connected;
        _retryCount = 0;
        _consecutiveHealthCheckFailures = 0;
        _statusMessage = 'Online (Resolved to $resolvedUrl) - ${_latencyMs}ms';
        WebSocketService.connect();
      } else {
        _scheduleReconnection();
      }
    } finally {
      _isTesting = false;
      notifyListeners();
    }

    return reachabilitySuccess;
  }

  // Fast parallel candidate resolution: tests all candidates simultaneously
  Future<String?> _tryResolveCandidateEndpoint() async {
    final candidates = ApiEndpoints.candidateGatewayUrls
        .where((c) => c != _serverUrl)
        .toList();
    if (candidates.isEmpty) return null;

    try {
      final futures = candidates.map((candidate) async {
        try {
          final stopwatch = Stopwatch()..start();
          await ApiService.pingEndpoint(candidate, timeoutSec: 3);
          stopwatch.stop();
          return candidate;
        } catch (_) {
          return null;
        }
      });

      final results = await Future.wait(futures);
      for (final res in results) {
        if (res != null) {
          AppLogger.info('Discovered working gateway endpoint: $res');
          return res;
        }
      }
    } catch (_) {}
    return null;
  }

  void _scheduleReconnection() {
    _backoffTimer?.cancel();
    _retryCount++;

    if (_retryCount >= 4) {
      // Gentle background auto-revive: stays in offline mode in UI, but tests quietly every 15s
      _status = GatewayStatus.offline;
      _statusMessage = 'Gateway offline. Auto-retrying in background...';
      notifyListeners();

      _backoffTimer = Timer(const Duration(seconds: 15), () async {
        if (_isDisposed) return;
        await _checkAndConnect();
      });
      return;
    }

    _status = GatewayStatus.reconnecting;
    final delaySeconds = _retryCount * 3; // 3s, 6s, 9s
    _statusMessage = 'Reconnecting in ${delaySeconds}s (attempt $_retryCount/3)...';
    AppLogger.warn(_statusMessage);
    notifyListeners();

    _backoffTimer = Timer(Duration(seconds: delaySeconds), () async {
      if (_isDisposed) return;
      await _checkAndConnect();
    });
  }

  void markAuthRequired() {
    _status = GatewayStatus.authRequired;
    _statusMessage = 'Authentication credentials required.';
    notifyListeners();
  }

  @override
  void dispose() {
    _isDisposed = true;
    _backoffTimer?.cancel();
    _healthCheckTimer?.cancel();
    super.dispose();
  }
}
