class AttackStateModel {
  final String attackMode;
  final String targetPatient;
  final dynamic timestamp;
  final String? attackLabel;
  final String? targetDeviceId;
  final String? targetDeviceName;
  final String? targetDeviceType;
  final String? targetPatientName;
  final String? wardNumber;
  final String? bedNumber;
  final String? severity;
  final String? alertMessage;
  final String? actionTaken;

  AttackStateModel({
    required this.attackMode,
    required this.targetPatient,
    this.timestamp,
    this.attackLabel,
    this.targetDeviceId,
    this.targetDeviceName,
    this.targetDeviceType,
    this.targetPatientName,
    this.wardNumber,
    this.bedNumber,
    this.severity,
    this.alertMessage,
    this.actionTaken,
  });

  factory AttackStateModel.fromJson(Map<String, dynamic> json) {
    return AttackStateModel(
      attackMode: json['attack_mode']?.toString() ?? 'Normal',
      targetPatient: json['target_patient']?.toString() ?? '',
      timestamp: json['timestamp'],
      attackLabel: json['attack_label']?.toString(),
      targetDeviceId: json['target_device_id']?.toString(),
      targetDeviceName: json['target_device_name']?.toString(),
      targetDeviceType: json['target_device_type']?.toString(),
      targetPatientName: json['target_patient_name']?.toString(),
      wardNumber: json['ward_number']?.toString(),
      bedNumber: json['bed_number']?.toString(),
      severity: json['severity']?.toString(),
      alertMessage: json['alert_message']?.toString(),
      actionTaken: json['action_taken']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'attack_mode': attackMode,
      'target_patient': targetPatient,
      'timestamp': timestamp,
      'attack_label': attackLabel,
      'target_device_id': targetDeviceId,
      'target_device_name': targetDeviceName,
      'target_device_type': targetDeviceType,
      'target_patient_name': targetPatientName,
      'ward_number': wardNumber,
      'bed_number': bedNumber,
      'severity': severity,
      'alert_message': alertMessage,
      'action_taken': actionTaken,
    };
  }

  bool get isAttacking => attackMode.isNotEmpty && attackMode != 'Normal';
}
