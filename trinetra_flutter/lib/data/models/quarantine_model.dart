class QuarantineModel {
  final String deviceId;
  final String macAddress;
  final String quarantineReason;
  final dynamic timestamp;
  final String? patientId;
  final String? deviceName;

  QuarantineModel({
    required this.deviceId,
    required this.macAddress,
    required this.quarantineReason,
    required this.timestamp,
    this.patientId,
    this.deviceName,
  });

  factory QuarantineModel.fromJson(Map<String, dynamic> json) {
    return QuarantineModel(
      deviceId: json['device_id']?.toString() ?? '',
      macAddress: json['mac_address']?.toString() ?? '00:00:00:00:00:00',
      quarantineReason: json['quarantine_reason']?.toString() ?? 'Automated Zero-Trust IPS Cutoff',
      timestamp: json['timestamp'] ?? DateTime.now().toIso8601String(),
      patientId: json['patient_id']?.toString(),
      deviceName: json['device_name']?.toString() ?? 'IoMT Bedside Monitor',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'device_id': deviceId,
      'mac_address': macAddress,
      'quarantine_reason': quarantineReason,
      'timestamp': timestamp,
      'patient_id': patientId,
      'device_name': deviceName,
    };
  }
}
