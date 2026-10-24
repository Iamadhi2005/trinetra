import 'dart:async';
import 'package:flutter/material.dart';
import '../data/models/log_entry_model.dart';
import '../data/models/patient_model.dart';
import '../data/models/patient_vitals_model.dart';
import '../data/models/quarantine_model.dart';
import '../data/services/api_service.dart';

class VitalsProvider extends ChangeNotifier {
  List<PatientModel> _patients = [];
  String _selectedPatientId = 'patient_102';
  bool _isAttacking = false;
  String _attackMode = 'Normal';

  // Live Real Patient Vitals
  int _heartRate = 75;
  int _spo2 = 98;
  String _bloodPressure = '120/80';
  int _respiratoryRate = 16;
  String _infusionRate = '5.0 mL/h';
  double _temperature = 37.0;
  int _battery = 98;
  String _pumpStatus = 'Pumping Normal';
  String _machineName = 'ICU Bedside Monitor';

  // Waveform Animation Phase
  int _ecgPhase = 0;
  Timer? _waveformTimer;
  Timer? _vitalsPollingTimer;
  Timer? _patientsPollingTimer;

  // Terminal Logs
  final List<LogEntryModel> _logs = [];

  // Quarantine Queue
  List<QuarantineModel> _quarantineQueue = [];
  bool _isLoadingQuarantine = false;

  // Attack detection callback for dual-channel alerts
  void Function(String patientId, String attackType, String severity, String message)? onAttackDetected;

  // Getters
  List<PatientModel> get patients => _patients;
  String get selectedPatientId => _selectedPatientId;
  PatientModel? get selectedPatient {
    try {
      return _patients.firstWhere((p) => p.id == _selectedPatientId);
    } catch (_) {
      return _patients.isNotEmpty ? _patients.first : null;
    }
  }

  bool get isAttacking => _isAttacking;
  String get attackMode => _attackMode;
  int get heartRate => _heartRate;
  int get spo2 => _spo2;
  String get bloodPressure => _bloodPressure;
  int get respiratoryRate => _respiratoryRate;
  String get infusionRate => _infusionRate;
  double get temperature => _temperature;
  int get battery => _battery;
  String get pumpStatus => _pumpStatus;
  String get machineName => _machineName;
  int get ecgPhase => _ecgPhase;
  List<LogEntryModel> get logs => List.unmodifiable(_logs);
  List<QuarantineModel> get quarantineQueue => _quarantineQueue;
  bool get isLoadingQuarantine => _isLoadingQuarantine;

  void init() {
    _startWaveformLoop();
    loadPatients();
    loadQuarantineQueue();
    _startVitalsSyncLoop();
    _startPatientsSyncLoop();
    addLog("System initialized. Monitoring ICU telemetry gateway.", type: "defense");
  }

  void _startWaveformLoop() {
    _waveformTimer?.cancel();
    // Dynamic timer speed based on heart rate (faster HR = faster ECG sweep)
    final intervalMs = _heartRate > 120 ? 180 : (_heartRate < 50 ? 500 : 300);
    _waveformTimer = Timer.periodic(Duration(milliseconds: intervalMs), (_) {
      _ecgPhase = (_ecgPhase + 1) % 18;
      notifyListeners();
    });
  }

  void _startVitalsSyncLoop() {
    _vitalsPollingTimer?.cancel();
    _vitalsPollingTimer = Timer.periodic(const Duration(milliseconds: 1500), (_) async {
      await fetchSelectedPatientVitals();
    });
  }

  void _startPatientsSyncLoop() {
    _patientsPollingTimer?.cancel();
    _patientsPollingTimer = Timer.periodic(const Duration(seconds: 5), (_) async {
      await loadPatients(silent: true);
    });
  }

  Future<void> fetchSelectedPatientVitals() async {
    try {
      final vitals = await ApiService.getPatientVitals(_selectedPatientId);
      if (vitals != null) {
        _heartRate = vitals.heartRate;
        _spo2 = vitals.spo2.round();
        _bloodPressure = vitals.bloodPressure;
        _respiratoryRate = vitals.respirationRate;
        _temperature = vitals.temperature;
        _infusionRate = '${vitals.infusionRate.toStringAsFixed(1)} mL/h';
        _battery = vitals.battery;
        _pumpStatus = vitals.pumpStatus;
        _machineName = vitals.machineName;

        if (vitals.isUnderAttack != _isAttacking || vitals.attackType != _attackMode) {
          _isAttacking = vitals.isUnderAttack;
          _attackMode = vitals.attackType;
          if (_isAttacking) {
            addLog("🚨 Real-time telemetry anomaly detected on $_selectedPatientId: $_attackMode", type: "exploit");
            onAttackDetected?.call(_selectedPatientId, _attackMode, "Critical", "Bedside monitor telemetry anomaly on $_selectedPatientId");
          }
        }
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> loadPatients({bool silent = false}) async {
    try {
      final fetched = await ApiService.getPatients();
      if (fetched.isNotEmpty) {
        _patients = fetched;
        // If current selection is not in list, select first
        if (!_patients.any((p) => p.id == _selectedPatientId)) {
          _selectedPatientId = _patients.first.id;
          fetchSelectedPatientVitals();
        }
        if (!silent) {
          addLog("Loaded ${_patients.length} active hospital patient monitors.", type: "defense");
        }
        notifyListeners();
      }
    } catch (_) {}
  }

  void selectPatient(String patientId) {
    if (_selectedPatientId != patientId) {
      _selectedPatientId = patientId;
      addLog("Active telemetry focus shifted to $patientId", type: "info");
      fetchSelectedPatientVitals();
      notifyListeners();
    }
  }

  void updateAttackStatus(bool attacking, String mode) {
    _isAttacking = attacking;
    _attackMode = mode;

    if (attacking) {
      if (mode == 'Override') {
        _heartRate = 190;
        _spo2 = 88;
        _bloodPressure = '50/30';
        _respiratoryRate = 32;
        _infusionRate = '500.0 mL/h';
      } else if (mode == 'Fault') {
        _heartRate = 0;
        _spo2 = 0;
        _bloodPressure = '--/--';
        _respiratoryRate = 0;
      } else {
        _heartRate = 134;
        _spo2 = 89;
        _bloodPressure = '148/96';
        _respiratoryRate = 26;
        _infusionRate = '25.0 mL/h';
      }
      addLog("🚨 ALERT: Anomaly mode '$mode' actively compromising patient $_selectedPatientId", type: "exploit");
    } else {
      fetchSelectedPatientVitals();
      addLog("✅ Normal sinus rhythm restored. Telemetry verified.", type: "defense");
    }
    notifyListeners();
  }

  Future<void> loadQuarantineQueue() async {
    _isLoadingQuarantine = true;
    notifyListeners();
    try {
      _quarantineQueue = await ApiService.getQuarantineQueue();
    } catch (_) {} finally {
      _isLoadingQuarantine = false;
      notifyListeners();
    }
  }

  void addLog(String message, {String type = 'info'}) {
    _logs.insert(0, LogEntryModel.create(message, type: type));
    if (_logs.length > 80) {
      _logs.removeLast();
    }
    notifyListeners();
  }

  void clearLogs() {
    _logs.clear();
    addLog("Terminal console logs purged.", type: "info");
    notifyListeners();
  }

  @override
  void dispose() {
    _waveformTimer?.cancel();
    _vitalsPollingTimer?.cancel();
    _patientsPollingTimer?.cancel();
    super.dispose();
  }
}
