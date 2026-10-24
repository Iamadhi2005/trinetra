import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../core/constants/api_endpoints.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/logger.dart';
import '../models/alert_model.dart';
import '../models/attack_state_model.dart';
import '../models/device_model.dart';
import '../models/patient_model.dart';
import '../models/patient_vitals_model.dart';
import '../models/quarantine_model.dart';
import '../models/user_model.dart';
import 'storage_service.dart';

class AuthExpiredException implements Exception {
  final String message;
  AuthExpiredException([this.message = 'Authentication token expired']);
  @override
  String toString() => message;
}

class NetworkUnavailableException implements Exception {
  final String message;
  NetworkUnavailableException([this.message = 'Gateway unreachable']);
  @override
  String toString() => message;
}

class ApiService {
  static Future<dynamic> request(
    String endpoint, {
    String method = 'GET',
    Map<String, dynamic>? body,
    Map<String, String>? customHeaders,
  }) async {
    final rawBase = await StorageService.getServerUrl();
    final baseUrl = Formatters.sanitizeUrl(rawBase);
    final token = await StorageService.getAuthToken();

    String cleanEndpoint = endpoint.trim();
    if (!cleanEndpoint.startsWith('/')) {
      cleanEndpoint = '/$cleanEndpoint';
    }

    final uri = Uri.parse(cleanEndpoint == '/' ? baseUrl : '$baseUrl$cleanEndpoint');

    final headers = <String, String>{
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'bypass-tunnel-reminder': 'true',
      'Bypass-Tunnel-Reminder': 'true',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      if (customHeaders != null) ...customHeaders,
    };

    http.Response response;
    try {
      final client = http.Client();
      const requestTimeout = Duration(seconds: 5);
      switch (method.toUpperCase()) {
        case 'POST':
          response = await client
              .post(uri, headers: headers, body: body != null ? jsonEncode(body) : null)
              .timeout(requestTimeout);
          break;
        case 'PUT':
          response = await client
              .put(uri, headers: headers, body: body != null ? jsonEncode(body) : null)
              .timeout(requestTimeout);
          break;
        case 'DELETE':
          response = await client.delete(uri, headers: headers).timeout(requestTimeout);
          break;
        case 'GET':
        default:
          response = await client.get(uri, headers: headers).timeout(requestTimeout);
          break;
      }
    } catch (e) {
      AppLogger.error('HTTP Request failed on $uri', e);
      throw NetworkUnavailableException('Network connection error: $e');
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return {};
      try {
        return jsonDecode(response.body);
      } catch (_) {
        return response.body;
      }
    } else {
      String errorMessage = "Server responded with status [${response.statusCode}]";
      try {
        final errJson = jsonDecode(response.body);
        if (errJson is Map && (errJson['detail'] != null || errJson['message'] != null)) {
          errorMessage = (errJson['detail'] ?? errJson['message']).toString();
        }
      } catch (_) {}

      if (response.statusCode == 401) {
        throw AuthExpiredException(errorMessage);
      }
      throw Exception(errorMessage);
    }
  }

  // Ping arbitrary endpoint for connectivity & auto-discovery (snappy 2s timeout)
  static Future<Map<String, dynamic>> pingEndpoint(String baseUrl, {int timeoutSec = 2}) async {
    final clean = Formatters.sanitizeUrl(baseUrl);
    final rawUri = Uri.parse(clean);
    final uri = rawUri.replace(path: '/');
    final headers = <String, String>{
      'Accept': 'application/json',
      'bypass-tunnel-reminder': 'true',
      'Bypass-Tunnel-Reminder': 'true',
      'User-Agent': 'TRINETRA-Mobile-Console/2.4',
    };
    final client = http.Client();
    try {
      final res = await client.get(uri, headers: headers).timeout(Duration(seconds: timeoutSec));
      if (res.statusCode >= 200 && res.statusCode < 300) {
        final data = jsonDecode(res.body);
        return data is Map<String, dynamic> ? data : {'name': 'TRINETRA API Gateway', 'status': 'Online'};
      }
      throw Exception('HTTP status ${res.statusCode}');
    } finally {
      client.close();
    }
  }

  // Ping Backend configured URL
  static Future<Map<String, dynamic>> pingBackend({int timeoutSec = 2}) async {
    final rawBase = await StorageService.getServerUrl();
    return await pingEndpoint(rawBase, timeoutSec: timeoutSec);
  }


  // Patients
  static Future<List<PatientModel>> getPatients() async {
    try {
      final res = await request(ApiEndpoints.patients);
      if (res is List) {
        return res.map((e) => PatientModel.fromJson(e as Map<String, dynamic>)).toList();
      }
    } catch (e) {
      AppLogger.warn('Failed to fetch patients from remote, using fallback roster: $e');
    }
    // Reliable Fallback ICU Patient roster
    return [
      PatientModel(id: "patient_101", name: "John Doe", age: 52, status: "Normal", wardNumber: "ICU-A", bedNumber: "01", doctorAssigned: "Dr. Radhi"),
      PatientModel(id: "patient_102", name: "Robert Smith", age: 61, status: "Normal", wardNumber: "ICU-A", bedNumber: "01", doctorAssigned: "Dr. Sarah Connor"),
      PatientModel(id: "PAT-6665", name: "Babu", age: 48, status: "Normal", wardNumber: "ICU-A", bedNumber: "02", doctorAssigned: "Dr. Sarah Connor"),
      PatientModel(id: "PAT-7850", name: "Raju", age: 54, status: "Normal", wardNumber: "ICU-A", bedNumber: "03", doctorAssigned: "Dr. Radhi"),
    ];
  }

  // Patient Live Vitals
  static Future<PatientVitalsModel?> getPatientVitals(String patientId) async {
    try {
      final res = await request(ApiEndpoints.patientVitals(patientId));
      if (res is Map<String, dynamic>) {
        return PatientVitalsModel.fromJson(res);
      }
    } catch (e) {
      AppLogger.warn('Failed to fetch vitals for $patientId: $e');
    }
    return null;
  }

  // Attack State & Simulation
  static Future<AttackStateModel> getAttackState() async {
    try {
      final res = await request(ApiEndpoints.attackState);
      return AttackStateModel.fromJson(res is Map<String, dynamic> ? res : {});
    } catch (_) {
      return AttackStateModel(attackMode: 'Normal', targetPatient: '');
    }
  }

  static Future<Map<String, dynamic>> triggerAttack(String mode, {String targetPatient = ""}) async {
    final res = await request(
      ApiEndpoints.triggerAttack,
      method: 'POST',
      body: {'attack_mode': mode, 'target_patient': targetPatient},
    );
    return res is Map<String, dynamic> ? res : {};
  }

  static Future<Map<String, dynamic>> disengageAll() async {
    return await triggerAttack("Normal", targetPatient: "");
  }

  // Alerts
  static Future<List<AlertModel>> getAlerts() async {
    try {
      final res = await request(ApiEndpoints.myAlerts);
      if (res is List) {
        return res.map((e) => AlertModel.fromJson(e as Map<String, dynamic>)).toList();
      }
    } catch (_) {
      final res = await request(ApiEndpoints.alerts);
      if (res is List) {
        return res.map((e) => AlertModel.fromJson(e as Map<String, dynamic>)).toList();
      }
    }
    return [];
  }

  static Future<AlertDetailModel> getAlertDetail(int alertId) async {
    final res = await request(ApiEndpoints.alertDetail(alertId));
    return AlertDetailModel.fromJson(res is Map<String, dynamic> ? res : {});
  }

  static Future<void> resolveAlert(int alertId, {String notes = "Resolved from TRINETRA Flutter Remote"}) async {
    await request(
      ApiEndpoints.alertResolve(alertId),
      method: 'POST',
      body: {'notes': notes},
    );
  }

  static Future<void> updateAlertStatus(int alertId, String status, {String notes = ""}) async {
    await request(
      ApiEndpoints.alertStatus(alertId),
      method: 'POST',
      body: {'status': status, 'notes': notes},
    );
  }

  // Quarantine Queue
  static Future<List<QuarantineModel>> getQuarantineQueue() async {
    try {
      final res = await request(ApiEndpoints.quarantineQueue);
      if (res is List) {
        return res.map((e) => QuarantineModel.fromJson(e as Map<String, dynamic>)).toList();
      }
    } catch (e) {
      AppLogger.warn('Failed to fetch quarantine queue: $e');
    }
    return [];
  }

  // Device & Notification Registration
  static Future<void> registerDeviceToken({String? fcmToken}) async {
    final deviceId = await StorageService.getOrCreateDeviceId();
    try {
      await request(
        ApiEndpoints.registerDevice,
        method: 'POST',
        body: {
          'device_id': deviceId,
          'fcm_token': fcmToken,
          'device_name': 'TRINETRA Flutter Console',
          'platform': 'android',
        },
      );
      AppLogger.defense('Device registered successfully with ID: $deviceId');
    } catch (e) {
      AppLogger.warn('Device registration note: $e');
    }
  }

  static Future<void> unregisterDeviceToken() async {
    final deviceId = await StorageService.getOrCreateDeviceId();
    try {
      await request(
        '${ApiEndpoints.unregisterDevice}?device_id=${Uri.encodeComponent(deviceId)}',
        method: 'POST',
      );
    } catch (_) {}
  }

  static Future<List<Map<String, dynamic>>> getNotificationLogs() async {
    try {
      final res = await request(ApiEndpoints.notificationLogs);
      if (res is List) {
        return res.map((e) => e as Map<String, dynamic>).toList();
      }
    } catch (_) {}
    return [];
  }

  static Future<void> acknowledgeNotification(int logId) async {
    await request('/api/notifications/ack/$logId', method: 'POST');
  }

  static Future<Map<String, dynamic>> dispatchTestNotification({
    String attackType = "ECG Waveform Spoofing",
    String patientId = "patient_102",
    String severity = "Critical",
  }) async {
    final endpoint = '${ApiEndpoints.dispatchTest}?attack_type=${Uri.encodeComponent(attackType)}&patient_id=${Uri.encodeComponent(patientId)}&severity=${Uri.encodeComponent(severity)}';
    final res = await request(endpoint, method: 'POST');
    return res is Map<String, dynamic> ? res : {};
  }

  // Admin APIs
  static Future<List<UserModel>> getAdminAccounts() async {
    final res = await request(ApiEndpoints.adminAccounts);
    if (res is List) {
      return res.map((e) => UserModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    return [];
  }

  static Future<void> assignDoctorToPatient(String patientId, String doctorName) async {
    await request(
      ApiEndpoints.assignDoctor,
      method: 'POST',
      body: {'patient_id': patientId, 'doctor_name': doctorName},
    );
  }

  static Future<void> resetPassword(int userId, {String? tempPassword}) async {
    await request(
      ApiEndpoints.resetPassword,
      method: 'POST',
      body: {'user_id': userId, 'new_temporary_password': tempPassword},
    );
  }

  static Future<void> disableAccount(int userId) async {
    await request(ApiEndpoints.disableAccount(userId), method: 'POST');
  }

  static Future<void> enableAccount(int userId) async {
    await request(ApiEndpoints.enableAccount(userId), method: 'POST');
  }

  static Future<List<DeviceModel>> getAdminDevices() async {
    final res = await request(ApiEndpoints.adminDevices);
    if (res is List) {
      return res.map((e) => DeviceModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    return [];
  }
}
