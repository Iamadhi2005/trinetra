class LogEntryModel {
  final String id;
  final String timestamp;
  final String message;
  final String type; // 'info', 'exploit', 'defense', 'error'

  LogEntryModel({
    required this.id,
    required this.timestamp,
    required this.message,
    this.type = 'info',
  });

  factory LogEntryModel.create(String message, {String type = 'info'}) {
    final now = DateTime.now();
    final timeStr = "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}:${now.second.toString().padLeft(2, '0')}";
    return LogEntryModel(
      id: "${DateTime.now().millisecondsSinceEpoch}_${message.hashCode}",
      timestamp: timeStr,
      message: message,
      type: type,
    );
  }
}
