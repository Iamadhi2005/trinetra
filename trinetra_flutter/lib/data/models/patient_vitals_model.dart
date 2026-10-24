class PatientVitalsModel {
  final String patientId;
  final String patientName;
  final int heartRate;
  final double spo2;
  final String bloodPressure;
  final double temperature;
  final int respirationRate;
  final double infusionRate;
  final int battery;
  final String pumpStatus;
  final String status;
  final bool isUnderAttack;
  final String attackType;
  final String machineName;
  final double ecgVoltage;

  PatientVitalsModel({
    required this.patientId,
    required this.patientName,
    required this.heartRate,
    required this.spo2,
    required this.bloodPressure,
    required this.temperature,
    required this.respirationRate,
    required this.infusionRate,
    required this.battery,
    required this.pumpStatus,
    required this.status,
    required this.isUnderAttack,
    required this.attackType,
    required this.machineName,
    required this.ecgVoltage,
  });

  factory PatientVitalsModel.fromJson(Map<String, dynamic> json) {
    return PatientVitalsModel(
      patientId: json['patient_id']?.toString() ?? json['id']?.toString() ?? '',
      patientName: json['patient_name']?.toString() ?? json['name']?.toString() ?? 'Patient',
      heartRate: json['heart_rate'] is num ? (json['heart_rate'] as num).toInt() : 75,
      spo2: json['spo2'] is num ? (json['spo2'] as num).toDouble() : 98.0,
      bloodPressure: json['blood_pressure']?.toString() ?? '120/80',
      temperature: json['temperature'] is num ? (json['temperature'] as num).toDouble() : 37.0,
      respirationRate: json['respiration_rate'] is num ? (json['respiration_rate'] as num).toInt() : 16,
      infusionRate: json['infusion_rate'] is num
          ? (json['infusion_rate'] as num).toDouble()
          : (json['infusion_level'] is num ? (json['infusion_level'] as num).toDouble() : 5.0),
      battery: json['battery'] is num ? (json['battery'] as num).toInt() : 100,
      pumpStatus: json['pump_status']?.toString() ?? 'Pumping Normal',
      status: json['status']?.toString() ?? 'Online',
      isUnderAttack: json['is_under_attack'] == true,
      attackType: json['attack_type']?.toString() ?? 'Normal',
      machineName: json['machine_name']?.toString() ?? 'ICU Bedside Monitor',
      ecgVoltage: json['ecg_voltage'] is num ? (json['ecg_voltage'] as num).toDouble() : 0.0,
    );
  }

  factory PatientVitalsModel.defaultFor(String patientId, String name) {
    return PatientVitalsModel(
      patientId: patientId,
      patientName: name,
      heartRate: 74,
      spo2: 98.4,
      bloodPressure: '120/80',
      temperature: 37.0,
      respirationRate: 16,
      infusionRate: 5.0,
      battery: 100,
      pumpStatus: 'Pumping Normal',
      status: 'Online',
      isUnderAttack: false,
      attackType: 'Normal',
      machineName: 'ICU Bedside Monitor',
      ecgVoltage: 0.0,
    );
  }
}
