import 'dart:typed_data';
import 'dart:ui';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../../core/utils/logger.dart';

class NotificationService {
  static final FlutterLocalNotificationsPlugin _notificationsPlugin =
      FlutterLocalNotificationsPlugin();

  static const String channelCritical = "trinetra_critical_alarm";
  static const String channelHigh = "trinetra_high_alarm";
  static const String channelInfo = "trinetra_info";

  static bool _isInitialized = false;

  static Future<void> init() async {
    if (_isInitialized) return;

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(android: androidSettings);

    await _notificationsPlugin.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        AppLogger.info("Notification tapped with payload: ${response.payload}");
      },
    );

    // Request permissions for Android 13+
    final androidImpl = _notificationsPlugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    if (androidImpl != null) {
      await androidImpl.requestNotificationsPermission();
      await androidImpl.requestExactAlarmsPermission();
    }

    // Setup Notification Channels with emergency sound and max priority
    await _setupChannels();
    _isInitialized = true;
    AppLogger.defense("System Notification Channels successfully configured.");
  }

  static Future<void> _setupChannels() async {
    final androidImpl = _notificationsPlugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    if (androidImpl == null) return;

    // 1. Critical Alarm Channel with beep_alert.wav
    final criticalChannel = AndroidNotificationChannel(
      channelCritical,
      "TRINETRA — Emergency Medical Alarms",
      description: "Critical patient physiological anomalies and severe network exploits",
      importance: Importance.max,
      playSound: true,
      sound: const RawResourceAndroidNotificationSound('beep_alert'),
      enableVibration: true,
      vibrationPattern: Int64List.fromList([0, 500, 200, 500, 200, 800]),
      enableLights: true,
      audioAttributesUsage: AudioAttributesUsage.alarm,
    );

    // 2. High Severity Channel
    final highChannel = AndroidNotificationChannel(
      channelHigh,
      "TRINETRA — High-Priority Alerts",
      description: "IoMT technical anomalies and security state updates",
      importance: Importance.high,
      playSound: true,
      sound: const RawResourceAndroidNotificationSound('beep_alert'),
      enableVibration: true,
      vibrationPattern: Int64List.fromList([0, 300, 200, 300]),
      enableLights: true,
    );

    // 3. Info Channel
    const infoChannel = AndroidNotificationChannel(
      channelInfo,
      "TRINETRA — Informational",
      description: "Routine gateway heartbeats and device syncs",
      importance: Importance.defaultImportance,
      playSound: true,
    );

    // 4. Ongoing Shield Channel (Background Keepalive)
    const shieldChannel = AndroidNotificationChannel(
      "trinetra_shield_service",
      "TRINETRA — Active Shield Service",
      description: "Maintains zero-trust background telemetry surveillance",
      importance: Importance.low,
      playSound: false,
      enableVibration: false,
    );

    await androidImpl.createNotificationChannel(criticalChannel);
    await androidImpl.createNotificationChannel(highChannel);
    await androidImpl.createNotificationChannel(infoChannel);
    await androidImpl.createNotificationChannel(shieldChannel);
  }

  static Future<void> showOngoingShieldNotification() async {
    await init();
    const androidDetails = AndroidNotificationDetails(
      "trinetra_shield_service",
      "TRINETRA — Active Shield Service",
      channelDescription: "Maintains zero-trust background telemetry surveillance",
      importance: Importance.low,
      priority: Priority.low,
      ongoing: true,
      autoCancel: false,
      showWhen: false,
      visibility: NotificationVisibility.public,
    );
    const notificationDetails = NotificationDetails(android: androidDetails);
    await _notificationsPlugin.show(
      9999,
      "🛡️ TRINETRA IoMT Zero-Trust Guard Active",
      "Live bedside telemetry & intrusion surveillance active in background.",
      notificationDetails,
    );
  }

  static Future<void> showSystemAlert({
    required int id,
    required String title,
    required String body,
    String severity = "Critical",
    String? payload,
  }) async {
    await init();

    final isCritical = severity.toLowerCase() == "critical";

    final androidDetails = AndroidNotificationDetails(
      isCritical ? channelCritical : channelHigh,
      isCritical ? "TRINETRA — Emergency Medical Alarms" : "TRINETRA — High-Priority Alerts",
      channelDescription: "Real-time Zero-Trust IoMT Alarms",
      importance: Importance.max,
      priority: Priority.max,
      playSound: true,
      sound: const RawResourceAndroidNotificationSound('beep_alert'),
      enableVibration: true,
      vibrationPattern: Int64List.fromList([0, 500, 200, 500, 200, 800]),
      enableLights: true,
      color: const Color(0xFFEF4444),
      fullScreenIntent: true, // Wakes up screen even when locked / screen is off!
      visibility: NotificationVisibility.public,
      category: AndroidNotificationCategory.alarm,
      audioAttributesUsage: AudioAttributesUsage.alarm,
      styleInformation: BigTextStyleInformation(
        body,
        contentTitle: title,
        summaryText: "TRINETRA ZERO-TRUST DEFENSE",
      ),
    );

    final notificationDetails = NotificationDetails(android: androidDetails);

    await _notificationsPlugin.show(
      id,
      title,
      body,
      notificationDetails,
      payload: payload,
    );
  }
}
