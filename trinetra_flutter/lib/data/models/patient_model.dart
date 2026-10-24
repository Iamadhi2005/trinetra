class PatientModel {
  final String id;
  final String name;
  final int? age;
  final String status;
  final String? phone;
  final String? wardNumber;
  final String? bedNumber;
  final String? doctorAssigned;
  final String? gender;
  final String? bloodGroup;
  final bool isCalibrated;
  final int calibrationProgress;

  PatientModel({
    required this.id,
    required this.name,
    this.age,
    required this.status,
    this.phone,
    this.wardNumber,
    this.bedNumber,
    this.doctorAssigned,
    this.gender,
    this.bloodGroup,
    this.isCalibrated = true,
    this.calibrationProgress = 100,
  });

  factory PatientModel.fromJson(Map<String, dynamic> json) {
    return PatientModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Unknown Patient',
      age: json['age'] is num ? (json['age'] as num).toInt() : null,
      status: json['status']?.toString() ?? 'Normal',
      phone: json['phone']?.toString(),
      wardNumber: json['ward_number']?.toString() ?? 'ICU-A',
      bedNumber: json['bed_number']?.toString() ?? '01',
      doctorAssigned: json['doctor_assigned']?.toString(),
      gender: json['gender']?.toString() ?? 'Male',
      bloodGroup: json['blood_group']?.toString() ?? 'O+',
      isCalibrated: json['is_calibrated'] == true,
      calibrationProgress: json['calibration_progress'] is num
          ? (json['calibration_progress'] as num).toInt()
          : 100,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'age': age,
      'status': status,
      'phone': phone,
      'ward_number': wardNumber,
      'bed_number': bedNumber,
      'doctor_assigned': doctorAssigned,
      'gender': gender,
      'blood_group': bloodGroup,
      'is_calibrated': isCalibrated,
      'calibration_progress': calibrationProgress,
    };
  }
}
