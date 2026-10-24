import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/logger.dart';
import 'storage_service.dart';

typedef AlertCallback = void Function(Map<String, dynamic> data);
typedef WsStateCallback = void Function(bool isConnected, String status);

class WebSocketService {
  static WebSocketChannel? _channel;
  static StreamSubscription? _channelSubscription;
  static bool _isConnected = false;
  static bool _isConnecting = false;
  static Timer? _reconnectTimer;
  static Timer? _heartbeatTimer;
  static int _reconnectAttempts = 0;
  static const int _maxBackoffSeconds = 30;

  static final Set<AlertCallback> _listeners = {};
  static final Set<WsStateCallback> _stateListeners = {};

  static bool get isConnected => _isConnected;
  static bool get isConnecting => _isConnecting;
  static int get reconnectAttempts => _reconnectAttempts;

  static void subscribe(AlertCallback cb) {
    _listeners.add(cb);
  }

  static void unsubscribe(AlertCallback cb) {
    _listeners.remove(cb);
  }

  static void addStateListener(WsStateCallback cb) {
    _stateListeners.add(cb);
    cb(_isConnected, _isConnected ? 'Connected' : (_isConnecting ? 'Connecting' : 'Disconnected'));
  }

  static void removeStateListener(WsStateCallback cb) {
    _stateListeners.remove(cb);
  }

  static void _notifyState(bool connected, String status) {
    _isConnected = connected;
    for (final cb in _stateListeners) {
      try {
        cb(connected, status);
      } catch (e) {
        AppLogger.warn('Error in WsStateCallback: $e');
      }
    }
  }

  static Future<void> connect({bool isManual = false}) async {
    if (isManual) {
      _reconnectAttempts = 0;
      _reconnectTimer?.cancel();
      _reconnectTimer = null;
    }

    if (_isConnected || _isConnecting) return;
    _isConnecting = true;
    _notifyState(false, 'Connecting');

    try {
      final serverUrl = await StorageService.getServerUrl();
      final token = await StorageService.getAuthToken() ?? '';
      final user = await StorageService.getCachedUser();

      // Convert http(s) to ws(s)
      String clean = Formatters.sanitizeUrl(serverUrl);
      final wsBase = clean.replaceFirst(RegExp(r'^http://'), 'ws://').replaceFirst(RegExp(r'^https://'), 'wss://');
      final wsUri = Uri.parse('$wsBase/ws/alerts?token=${Uri.encodeComponent(token)}&role=${Uri.encodeComponent(user?.role ?? '')}&user_id=${Uri.encodeComponent(user?.id.toString() ?? '')}');

      AppLogger.info('Connecting to Alert WebSocket: $wsUri (attempt ${_reconnectAttempts + 1})');

      _channel = WebSocketChannel.connect(wsUri);
      _isConnecting = false;

      _channelSubscription?.cancel();
      _channelSubscription = _channel?.stream.listen(
        (message) {
          // Once we receive any data, connection is verified
          if (!_isConnected) {
            _isConnected = true;
            _reconnectAttempts = 0;
            _notifyState(true, 'Connected');
            _startHeartbeat();

            // Send registration packet upon verified connection
            if (user != null) {
              try {
                _channel?.sink.add(jsonEncode({
                  'type': 'REGISTER_CLIENT',
                  'user_id': user.id,
                  'username': user.username,
                  'role': user.role,
                  'assigned_patient_id': user.assignedPatientId,
                }));
              } catch (_) {}
            }
          }

          try {
            final data = jsonDecode(message.toString());
            if (data is Map<String, dynamic>) {
              // Respond to PONG if server sent it
              if (data['type'] == 'PONG') {
                return;
              }

              for (final cb in _listeners) {
                try {
                  cb(data);
                } catch (e) {
                  AppLogger.error('Error in WebSocket listener', e);
                }
              }
            }
          } catch (e) {
            AppLogger.warn('WebSocket message parse error: $e');
          }
        },
        onError: (err) {
          AppLogger.warn('WebSocket stream error: $err');
          _handleDisconnect('Connection error');
        },
        onDone: () {
          AppLogger.warn('WebSocket connection closed.');
          _handleDisconnect('Connection closed');
        },
        cancelOnError: true,
      );

      // Trigger first client registration right after connect attempt
      if (user != null) {
        try {
          _channel?.sink.add(jsonEncode({
            'type': 'REGISTER_CLIENT',
            'user_id': user.id,
            'username': user.username,
            'role': user.role,
            'assigned_patient_id': user.assignedPatientId,
          }));
        } catch (_) {}
      }

      // Mark connected optimistically if no immediate error thrown
      _isConnected = true;
      _notifyState(true, 'Connected');
      _startHeartbeat();
    } catch (e) {
      AppLogger.error('Failed to establish WebSocket connection', e);
      _handleDisconnect('Connection failed');
    }
  }

  static void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      if (_channel != null && _isConnected) {
        try {
          _channel?.sink.add(jsonEncode({'type': 'PING', 'timestamp': DateTime.now().millisecondsSinceEpoch}));
        } catch (_) {
          _handleDisconnect('Heartbeat failed');
        }
      }
    });
  }

  static void _handleDisconnect(String reason) {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
    _channelSubscription?.cancel();
    _channelSubscription = null;
    _isConnected = false;
    _isConnecting = false;
    _channel = null;

    _scheduleReconnect();
  }

  static void _scheduleReconnect() {
    _reconnectTimer?.cancel();
    _reconnectAttempts++;

    // Fast exponential backoff for first 3 attempts (2s, 4s, 8s)
    // After 3 attempts, slow down to a steady background retry every 20s
    final int delaySeconds;
    if (_reconnectAttempts <= 3) {
      delaySeconds = pow(2, _reconnectAttempts).toInt();
      _notifyState(false, 'Reconnecting in ${delaySeconds}s (attempt $_reconnectAttempts/3)');
    } else {
      delaySeconds = 20;
      _notifyState(false, 'Disconnected (Auto-retrying in background)');
    }

    _reconnectTimer = Timer(Duration(seconds: delaySeconds), () {
      connect();
    });
  }

  static void manualReconnect() {
    disconnect();
    connect(isManual: true);
  }

  static void disconnect() {
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
    _channelSubscription?.cancel();
    _channelSubscription = null;
    _isConnected = false;
    _isConnecting = false;
    try {
      _channel?.sink.close();
    } catch (_) {}
    _channel = null;
    _notifyState(false, 'Disconnected');
  }
}
