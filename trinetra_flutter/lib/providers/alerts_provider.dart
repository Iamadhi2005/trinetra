import 'dart:async';
import 'package:flutter/material.dart';
import '../data/models/alert_model.dart';
import '../data/services/alarm_sound_service.dart';
import '../data/services/api_service.dart';
import '../data/services/notification_service.dart';
import '../data/services/websocket_service.dart';
import '../core/utils/logger.dart';

class AlertsProvider extends ChangeNotifier {
  List<AlertModel> _alerts = [];
  bool _isLoading = false;
  String _activeFilter = 'ALL';
  int? _resolvingId;
  final Set<String> _notifiedAlertKeys = {};
  bool _isInitialized = false;
  Timer? _backgroundSyncTimer;
  String _lastNotifiedAttackKey = "";

  // Selected Alert for Detailed Inspection Modal
  AlertDetailModel? _selectedAlertDetail;
  bool _isLoadingDetail = false;

  // Foreground In-App Alert Banner State
  bool _isBannerVisible = false;
  String _bannerTitle = '';
  String _bannerBody = '';
  String _bannerSeverity = 'Critical';
  Timer? _bannerDismissTimer;

  // Delivery Audit Logs
  List<Map<String, dynamic>> _auditLogs = [];
  bool _isLoadingAuditLogs = false;

  // Getters
  List<AlertModel> get alerts {
    if (_activeFilter == 'ALL') return _alerts;
    if (_activeFilter == 'RESOLVED') {
      return _alerts.where((a) => a.isResolved).toList();
    }
    return _alerts.where((a) => a.severity.toUpperCase() == _activeFilter && !a.isResolved).toList();
  }

  int get unresolvedCount => _alerts.where((a) => !a.isResolved).length;
  int get criticalCount => _alerts.where((a) => a.isCritical && !a.isResolved).length;

  bool get isLoading => _isLoading;
  String get activeFilter => _activeFilter;
  int? get resolvingId => _resolvingId;
  AlertDetailModel? get selectedAlertDetail => _selectedAlertDetail;
  bool get isLoadingDetail => _isLoadingDetail;

  bool get isBannerVisible => _isBannerVisible;
  String get bannerTitle => _bannerTitle;
  String get bannerBody => _bannerBody;
  String get bannerSeverity => _bannerSeverity;

  List<Map<String, dynamic>> get auditLogs => _auditLogs;
  bool get isLoadingAuditLogs => _isLoadingAuditLogs;

  void init() {
    if (_isInitialized) return;
    _isInitialized = true;

    NotificationService.init().then((_) {
      NotificationService.showOngoingShieldNotification();
    });
    loadAlerts();
    _subscribeToWebSocket();
    _startBackgroundSync();
  }

  void _startBackgroundSync() {
    _backgroundSyncTimer?.cancel();
    _backgroundSyncTimer = Timer.periodic(const Duration(seconds: 3), (_) async {
      try {
        // 1. Check authoritative attack state directly from gateway
        final attackState = await ApiService.getAttackState();
        final attackMode = attackState.attackMode;
        final targetPatient = attackState.targetPatient;

        if (attackMode != 'Normal') {
          final attackKey = '${attackMode}_${targetPatient}_${attackState.timestamp}';
          if (_lastNotifiedAttackKey != attackKey) {
            _lastNotifiedAttackKey = attackKey;
            handleActiveAttack(
              attackMode: attackMode,
              attackType: attackState.attackLabel ?? attackMode,
              patientId: targetPatient,
              severity: attackState.severity ?? 'Critical',
              message: attackState.alertMessage ?? '🚨 Malicious intrusion detected on medical telemetry network.',
            );
          }
        } else if (_lastNotifiedAttackKey.isNotEmpty) {
          _lastNotifiedAttackKey = "";
          dismissBanner();
        }

        // 2. Fetch recent alerts list
        final freshAlerts = await ApiService.getAlerts();
        for (final alert in freshAlerts) {
          final alertKey = '${alert.id}_${alert.timestamp}_${alert.message}';
          if (!alert.isResolved && !_notifiedAlertKeys.contains(alertKey)) {
            _notifiedAlertKeys.add(alertKey);
            AlarmSoundService.playEmergencyBeep();
            showInAppBanner(
              "🚨 ${alert.severity.toUpperCase()} ALERT: ${alert.patientName}",
              "${alert.message} (${alert.deviceName})",
              severity: alert.severity,
            );
            NotificationService.showSystemAlert(
              id: alert.id,
              title: "🚨 ${alert.severity.toUpperCase()} ALERT: ${alert.patientName}",
              body: "${alert.message} (${alert.deviceName})",
              severity: alert.severity,
            );
          }
        }
        _alerts = freshAlerts;
        notifyListeners();
      } catch (_) {}
    });
  }

  void setFilter(String filter) {
    _activeFilter = filter;
    notifyListeners();
  }

  void _subscribeToWebSocket() {
    WebSocketService.subscribe((data) {
      final type = data['type']?.toString() ?? '';
      AppLogger.info('WebSocket alert received: $type');

      if (type == 'SECURITY_ALERT' || type == 'CRITICAL_ATTACK' || type == 'INITIAL_ATTACK_SYNC') {
        final title = data['title']?.toString() ?? '🚨 CRITICAL ATTACK DETECTED';
        final message = data['message']?.toString() ?? data['body']?.toString() ?? 'IoMT Threat flagged on bedside monitor.';
        final severity = data['severity']?.toString() ?? 'Critical';
        final alertId = data['alert_id'] is num ? (data['alert_id'] as num).toInt() : (DateTime.now().millisecondsSinceEpoch % 100000);

        final alertKey = '${alertId}_${data['timestamp']}_$message';
        _notifiedAlertKeys.add(alertKey);

        // 1. Play Emergency Beep
        AlarmSoundService.playEmergencyBeep();

        // 2. Show Slide-Down In-App Banner
        showInAppBanner(title, message, severity: severity);

        // 3. Show System Notification (Drops down even if outside app / screen locked!)
        NotificationService.showSystemAlert(
          id: alertId,
          title: title,
          body: message,
          severity: severity,
        );

        // Refresh alerts list immediately
        loadAlerts();
      } else if (type == 'THREAT_NEUTRALIZED') {
        _lastNotifiedAttackKey = "";
        dismissBanner();
        loadAlerts();
      }
    });
  }

  // Authoritative external trigger (callable from VitalsProvider for dual-channel delivery)
  void handleActiveAttack({
    required String attackMode,
    required String attackType,
    String? patientId,
    String? deviceName,
    String? severity,
    String? message,
  }) {
    if (attackMode == 'Normal') {
      dismissBanner();
      return;
    }

    final sev = severity ?? 'Critical';
    final title = '🚨 ${sev.toUpperCase()} INTRUSION: $attackType';
    final body = message ?? 'Bedside monitor ($deviceName) flagged an active anomaly on $patientId.';

    AlarmSoundService.playEmergencyBeep();
    showInAppBanner(title, body, severity: sev);
    NotificationService.showSystemAlert(
      id: DateTime.now().millisecondsSinceEpoch % 100000,
      title: title,
      body: body,
      severity: sev,
    );
    loadAlerts();
  }

  Future<void> loadAlerts() async {
    _isLoading = true;
    notifyListeners();
    try {
      _alerts = await ApiService.getAlerts();
    } catch (_) {} finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> resolveAlert(int alertId, {String notes = "Resolved from TRINETRA Flutter Console"}) async {
    _resolvingId = alertId;
    notifyListeners();
    try {
      await ApiService.resolveAlert(alertId, notes: notes);
      _notifiedAlertKeys.removeWhere((k) => k.startsWith('${alertId}_'));
      await loadAlerts();
    } catch (_) {} finally {
      _resolvingId = null;
      notifyListeners();
    }
  }

  Future<void> inspectAlert(int alertId) async {
    _isLoadingDetail = true;
    _selectedAlertDetail = null;
    notifyListeners();
    try {
      _selectedAlertDetail = await ApiService.getAlertDetail(alertId);
    } catch (_) {} finally {
      _isLoadingDetail = false;
      notifyListeners();
    }
  }

  void closeAlertDetail() {
    _selectedAlertDetail = null;
    notifyListeners();
  }

  void showInAppBanner(String title, String body, {String severity = 'Critical'}) {
    _bannerTitle = title;
    _bannerBody = body;
    _bannerSeverity = severity;
    _isBannerVisible = true;
    notifyListeners();

    _bannerDismissTimer?.cancel();
    _bannerDismissTimer = Timer(const Duration(seconds: 10), () {
      _isBannerVisible = false;
      notifyListeners();
    });
  }

  void dismissBanner() {
    _bannerDismissTimer?.cancel();
    _isBannerVisible = false;
    notifyListeners();
  }

  Future<void> loadAuditLogs() async {
    _isLoadingAuditLogs = true;
    notifyListeners();
    try {
      _auditLogs = await ApiService.getNotificationLogs();
    } catch (_) {} finally {
      _isLoadingAuditLogs = false;
      notifyListeners();
    }
  }

  Future<void> acknowledgeLog(int logId) async {
    try {
      await ApiService.acknowledgeNotification(logId);
      await loadAuditLogs();
    } catch (_) {}
  }

  Future<String> dispatchTestNotification(String simState, {String patientId = 'patient_102'}) async {
    try {
      await ApiService.dispatchTestNotification(
        attackType: "ECG Waveform Spoofing",
        patientId: patientId,
        severity: "Critical",
      );

      if (simState == "FOREGROUND") {
        AlarmSoundService.playEmergencyBeep();
        showInAppBanner(
          "🚨 CRITICAL ALERT: ECG Waveform Spoofing",
          "Attending Doctor Alerted: Sensor integrity UNTRUSTED. Heart rate 134 bpm.",
          severity: "Critical",
        );
        return "Foreground Alert Triggered: Audible tone and in-app banner displayed.";
      } else if (simState == "BACKGROUND") {
        return "Background Notification Emitted: High-priority channel activated.";
      } else {
        return "Screen-Off Alert: Device wake-lock triggered with patient privacy masking.";
      }
    } catch (e) {
      return "Test dispatch error: $e";
    }
  }

  @override
  void dispose() {
    _bannerDismissTimer?.cancel();
    _backgroundSyncTimer?.cancel();
    super.dispose();
  }
}
