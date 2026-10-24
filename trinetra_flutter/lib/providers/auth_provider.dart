import 'package:flutter/material.dart';
import '../data/models/user_model.dart';
import '../data/services/auth_service.dart';
import '../data/services/storage_service.dart';

class AuthProvider extends ChangeNotifier {
  UserModel? _currentUser;
  bool _isLoading = false;
  String? _errorMessage;
  bool _initialized = false;

  UserModel? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get initialized => _initialized;
  bool get isAuthenticated => _currentUser != null;

  Future<void> init() async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await StorageService.getAuthToken();
      final cachedUser = await StorageService.getCachedUser();

      if (token != null && cachedUser != null) {
        _currentUser = cachedUser;
        // Optionally refresh profile from remote in background
        AuthService.getCurrentUser().then((u) {
          if (u != null) {
            _currentUser = u;
            notifyListeners();
          }
        });
      } else {
        // Auto-authenticate as default doctor for smooth initial experience
        try {
          _currentUser = await AuthService.login('dr.connor', 'DoctorInit2026!');
        } catch (_) {
          // Fallback to local default doctor object
          _currentUser = UserModel(
            id: 2,
            username: 'dr.connor',
            name: 'Dr. Sarah Connor',
            role: 'Doctor',
            department: 'Cardiology ICU-A',
            assignedPatientId: 'patient_102',
          );
        }
      }
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      _initialized = true;
      notifyListeners();
    }
  }

  Future<bool> login(String username, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _currentUser = await AuthService.login(username, password);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await AuthService.logout();
    _currentUser = null;
    notifyListeners();
  }

  Future<bool> changePassword(String oldPassword, String newPassword) async {
    try {
      await AuthService.changePassword(oldPassword, newPassword);
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }
}
