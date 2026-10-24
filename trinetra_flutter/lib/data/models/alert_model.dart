class AlertModel {
  final int id;
  final dynamic timestamp;
  final String deviceId;
  final String deviceName;
  final String deviceType;
  final String patientId;
  final String patientName;
  final String severity; // "Critical", "High", "Warning", "Info"
  final String message;
  final String status; // "Unresolved", "Resolved", "Acknowledged", "Investigating"
  final String? resolutionNotes;

  AlertModel({
    required this.id,
    required this.timestamp,
    required this.deviceId,
    required this.deviceName,
    required this.deviceType,
    required this.patientId,
    required this.patientName,
    required this.severity,
    required this.message,
    required this.status,
    this.resolutionNotes,
  });

  factory AlertModel.fromJson(Map<String, dynamic> json) {
    return AlertModel(
      id: json['id'] is num ? (json['id'] as num).toInt() : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      timestamp: json['timestamp'] ?? DateTime.now().toIso8601String(),
      deviceId: json['device_id']?.toString() ?? 'Unknown Device',
      deviceName: json['device_name']?.toString() ?? 'Medical Device',
      deviceType: json['device_type']?.toString() ?? 'IoMT Node',
      patientId: json['patient_id']?.toString() ?? '',
      patientName: json['patient_name']?.toString() ?? 'Patient',
      severity: json['severity']?.toString() ?? 'Warning',
      message: json['message']?.toString() ?? '',
      status: json['status']?.toString() ?? 'Unresolved',
      resolutionNotes: json['resolution_notes']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'timestamp': timestamp,
      'device_id': deviceId,
      'device_name': deviceName,
      'device_type': deviceType,
      'patient_id': patientId,
      'patient_name': patientName,
      'severity': severity,
      'message': message,
      'status': status,
      'resolution_notes': resolutionNotes,
    };
  }

  bool get isCritical => severity.toLowerCase() == 'critical';
  bool get isHigh => severity.toLowerCase() == 'high';
  bool get isWarning => severity.toLowerCase() == 'warning';
  bool get isResolved => status.toLowerCase() == 'resolved';
}

class AlertDetailModel {
  final AlertModel alert;
  final Map<String, dynamic>? patient;
  final Map<String, dynamic>? device;
  final Map<String, dynamic>? securityEvent;

  AlertDetailModel({
    required this.alert,
    this.patient,
    this.device,
    this.securityEvent,
  });

  factory AlertDetailModel.fromJson(Map<String, dynamic> json) {
    return AlertDetailModel(
      alert: AlertModel.fromJson(json['alert'] ?? json),
      patient: json['patient'] is Map<String, dynamic> ? json['patient'] : null,
      device: json['device'] is Map<String, dynamic> ? json['device'] : null,
      securityEvent: json['security_event'] is Map<String, dynamic> ? json['security_event'] : null,
    );
  }
}
