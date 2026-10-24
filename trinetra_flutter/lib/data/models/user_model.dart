class UserModel {
  final int id;
  final String username;
  final String name;
  final String role; // "Doctor", "Patient", "Tech", "Admin", "Nurse"
  final String? department;
  final String? assignedPatientId;
  final bool isActive;
  final bool mustChangePassword;
  final String? createdAt;

  UserModel({
    required this.id,
    required this.username,
    required this.name,
    required this.role,
    this.department,
    this.assignedPatientId,
    this.isActive = true,
    this.mustChangePassword = false,
    this.createdAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] is num ? (json['id'] as num).toInt() : 0,
      username: json['username']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      role: json['role']?.toString() ?? 'Doctor',
      department: json['department']?.toString(),
      assignedPatientId: json['assigned_patient_id']?.toString(),
      isActive: json['is_active'] == true || json['is_active'] == 1,
      mustChangePassword: json['must_change_password'] == true || json['must_change_password'] == 1,
      createdAt: json['created_at']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'name': name,
      'role': role,
      'department': department,
      'assigned_patient_id': assignedPatientId,
      'is_active': isActive,
      'must_change_password': mustChangePassword,
      'created_at': createdAt,
    };
  }

  bool get isAdmin => role.toLowerCase() == 'admin';
  bool get isDoctor => role.toLowerCase() == 'doctor';
  bool get isNurse => role.toLowerCase() == 'nurse';
  bool get isTech => role.toLowerCase() == 'tech';
  bool get isPatient => role.toLowerCase() == 'patient';
}
