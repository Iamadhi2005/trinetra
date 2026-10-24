class ApiEndpoints {
  // Preset Gateway URLs
  static const String defaultProductionCloudUrl = "https://trinetra-ya1h.onrender.com";
  static const String defaultTailscaleUrl = "http://100.86.143.62:8000";
  static const String defaultLocalWifiUrl = "http://192.168.1.165:8000";
  static const String defaultCloudTunnelUrl = "https://fresh-quail-93.loca.lt";
  static const String defaultEmulatorUrl = "http://10.0.2.2:8000";

  // Candidate gateway endpoints for automatic discovery & multi-network resolution
  static const List<String> candidateGatewayUrls = [
    defaultProductionCloudUrl,
    defaultTailscaleUrl,
    defaultLocalWifiUrl,
    defaultCloudTunnelUrl,
    "http://127.0.0.1:8000",
    defaultEmulatorUrl,
  ];

  // Auth & Account
  static const String rootPing = "/";
  static const String login = "/api/auth/login";
  static const String me = "/api/auth/me";
  static const String changePassword = "/api/auth/change-password";

  // Clinical & Patients
  static const String patients = "/api/patients";
  static String patientVitals(String id) => "/api/patients/$id/vitals";
  static String wsTelemetry(String id) => "/ws/telemetry/$id";

  // Security & Attack Engine
  static const String attackState = "/api/security/attack";
  static const String triggerAttack = "/api/security/attack";
  static const String quarantineQueue = "/api/security/quarantine";

  // Alerts & Incident Management
  static const String alerts = "/api/alerts";
  static const String myAlerts = "/api/notifications/my-alerts";
  static String alertDetail(int id) => "/api/alerts/$id/detail";
  static String alertStatus(int id) => "/api/alerts/$id/status";
  static String alertResolve(int id) => "/api/alerts/$id/resolve";

  // Notifications & Device Registration
  static const String registerDevice = "/api/notifications/register-device";
  static const String unregisterDevice = "/api/notifications/unregister-device";
  static const String notificationLogs = "/api/notifications/logs";
  static const String dispatchTest = "/api/notifications/dispatch-test";

  // Administrator Control
  static const String adminAccounts = "/api/admin/accounts";
  static const String assignDoctor = "/api/admin/assign-doctor";
  static const String resetPassword = "/api/admin/reset-password";
  static String disableAccount(int id) => "/api/admin/disable-account/$id";
  static String enableAccount(int id) => "/api/admin/enable-account/$id";
  static const String adminDevices = "/api/admin/devices";

  // WebSocket
  static const String wsAlerts = "/ws/alerts";
}
