import 'dart:async';
import 'package:flutter/material.dart';
import '../data/models/attack_state_model.dart';
import '../data/services/api_service.dart';

class ScenariosProvider extends ChangeNotifier {
  AttackStateModel _attackState = AttackStateModel(attackMode: 'Normal', targetPatient: '');
  bool _isLoading = false;
  int _elapsedSeconds = 0;
  Timer? _attackTimer;

  AttackStateModel get attackState => _attackState;
  bool get isLoading => _isLoading;
  int get elapsedSeconds => _elapsedSeconds;
  bool get isAttacking => _attackState.isAttacking;

  void init() {
    refreshAttackState();
  }

  Future<void> refreshAttackState() async {
    try {
      _attackState = await ApiService.getAttackState();
      if (_attackState.isAttacking) {
        _startTimer();
      } else {
        _stopTimer();
      }
      notifyListeners();
    } catch (_) {}
  }

  Future<bool> triggerScenario(String mode, String targetPatient) async {
    _isLoading = true;
    notifyListeners();
    try {
      final res = await ApiService.triggerAttack(mode, targetPatient: targetPatient);
      if (res['state'] is Map<String, dynamic>) {
        _attackState = AttackStateModel.fromJson(res['state']);
      } else {
        _attackState = AttackStateModel(attackMode: mode, targetPatient: targetPatient);
      }
      _startTimer();
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (_) {
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> disengageAll() async {
    _isLoading = true;
    notifyListeners();
    try {
      await ApiService.disengageAll();
      _attackState = AttackStateModel(attackMode: 'Normal', targetPatient: '');
      _stopTimer();
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (_) {
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  void _startTimer() {
    _stopTimer();
    _elapsedSeconds = 0;
    _attackTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      _elapsedSeconds++;
      notifyListeners();
    });
  }

  void _stopTimer() {
    _attackTimer?.cancel();
    _attackTimer = null;
    _elapsedSeconds = 0;
  }

  @override
  void dispose() {
    _stopTimer();
    super.dispose();
  }
}
