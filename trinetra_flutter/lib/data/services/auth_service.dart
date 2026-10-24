import 'dart:async';
import '../../core/constants/api_endpoints.dart';
import '../../core/utils/logger.dart';
import '../models/user_model.dart';
import 'api_service.dart';
import 'storage_service.dart';

class AuthService {
  static Future<UserModel> login(String username, String password) async {
    final res = await ApiService.request(
      ApiEndpoints.login,
      method: 'POST',
      body: {
        'username': username,
        'password': password,
      },
    );

    if (res is Map<String, dynamic>) {
      final token = res['access_token']?.toString();
      final userJson = res['user'];

      if (token != null) {
        await StorageService.setAuthToken(token);
      }

      UserModel user;
      if (userJson is Map<String, dynamic>) {
        user = UserModel.fromJson(userJson);
      } else {
        user = UserModel(
          id: 1,
          username: username,
          name: username,
          role: 'Doctor',
        );
      }

      await StorageService.setCachedUser(user);
      await ApiService.registerDeviceToken();
      return user;
    }
    throw Exception("Invalid response format from login endpoint.");
  }

  static Future<void> logout() async {
    try {
      await ApiService.unregisterDeviceToken();
    } catch (_) {}
    await StorageService.clearAll();
  }

  static Future<UserModel?> getCurrentUser() async {
    try {
      final res = await ApiService.request(ApiEndpoints.me);
      if (res is Map<String, dynamic>) {
        final user = UserModel.fromJson(res);
        await StorageService.setCachedUser(user);
        return user;
      }
    } catch (e) {
      AppLogger.warn('Failed to refresh user profile from remote: $e');
    }
    return await StorageService.getCachedUser();
  }

  static Future<void> changePassword(String oldPassword, String newPassword) async {
    await ApiService.request(
      ApiEndpoints.changePassword,
      method: 'POST',
      body: {
        'old_password': oldPassword,
        'new_password': newPassword,
      },
    );
  }
}
