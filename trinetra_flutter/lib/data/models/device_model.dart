class DeviceModel {
  final int id;
  final String deviceId;
  final String? fcmToken;
  final String deviceName;
  final String platform;
  final int? userId;
  final String? username;
  final String? userRole;
  final bool isActive;
  final String? lastSeen;

  DeviceModel({
    required this.id,
    required this.deviceId,
    this.fcmToken,
    required this.deviceName,
    required this.platform,
    this.userId,
    this.username,
    this.userRole,
    this.isActive = true,
    this.lastSeen,
  });

  factory DeviceModel.fromJson(Map<String, dynamic> json) {
    return DeviceModel(
      id: json['id'] is num ? (json['id'] as num).toInt() : 0,
      deviceId: json['device_id']?.toString() ?? '',
      fcmToken: json['fcm_token']?.toString(),
      deviceName: json['device_name']?.toString() ?? 'Mobile Device',
      platform: json['platform']?.toString() ?? 'android',
      userId: json['user_id'] is num ? (json['user_id'] as num).toInt() : null,
      username: json['username']?.toString(),
      userRole: json['user_role']?.toString(),
      isActive: json['is_active'] == true || json['is_active'] == 1,
      lastSeen: json['last_seen']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'device_id': deviceId,
      'fcm_token': fcmToken,
      'device_name': deviceName,
      'platform': platform,
      'user_id': userId,
      'username': username,
      'user_role': userRole,
      'is_active': isActive,
      'last_seen': lastSeen,
    };
  }
}
