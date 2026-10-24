import 'dart:convert';
import 'dart:math';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/utils/formatters.dart';
import '../models/user_model.dart';

class StorageService {
  static const String _keyServerUrl = 'trinetra_server_url';
  static const String _keyAuthToken = 'trinetra_auth_token';
  static const String _keyCachedUser = 'trinetra_cached_user';
  static const String _keyDeviceUuid = 'trinetra_device_uuid';

  static SharedPreferences? _prefs;

  static Future<void> init() async {
    _prefs ??= await SharedPreferences.getInstance();
  }

  static Future<String> getServerUrl() async {
    await init();
    final saved = _prefs?.getString(_keyServerUrl);
    if (saved != null && saved.trim().isNotEmpty) {
      return Formatters.sanitizeUrl(saved);
    }
    return ApiEndpoints.defaultLocalWifiUrl;
  }

  static Future<void> setServerUrl(String url) async {
    await init();
    final clean = Formatters.sanitizeUrl(url);
    await _prefs?.setString(_keyServerUrl, clean);
  }

  static Future<String?> getAuthToken() async {
    await init();
    return _prefs?.getString(_keyAuthToken);
  }

  static Future<void> setAuthToken(String? token) async {
    await init();
    if (token != null) {
      await _prefs?.setString(_keyAuthToken, token);
    } else {
      await _prefs?.remove(_keyAuthToken);
    }
  }

  static Future<UserModel?> getCachedUser() async {
    await init();
    final raw = _prefs?.getString(_keyCachedUser);
    if (raw == null || raw.isEmpty) return null;
    try {
      final json = jsonDecode(raw);
      return UserModel.fromJson(json);
    } catch (_) {
      return null;
    }
  }

  static Future<void> setCachedUser(UserModel? user) async {
    await init();
    if (user != null) {
      await _prefs?.setString(_keyCachedUser, jsonEncode(user.toJson()));
    } else {
      await _prefs?.remove(_keyCachedUser);
    }
  }

  static Future<String> getOrCreateDeviceId() async {
    await init();
    String? id = _prefs?.getString(_keyDeviceUuid);
    if (id == null || id.isEmpty) {
      final rnd = Random();
      final chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      final randSuffix = List.generate(8, (_) => chars[rnd.nextInt(chars.length)]).join();
      id = "TRN-AND-$randSuffix";
      await _prefs?.setString(_keyDeviceUuid, id);
    }
    return id;
  }

  static Future<void> clearAll() async {
    await init();
    await _prefs?.remove(_keyAuthToken);
    await _prefs?.remove(_keyCachedUser);
  }
}
