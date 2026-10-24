import 'package:intl/intl.dart';

class Formatters {
  static String formatTimestamp(dynamic ts) {
    if (ts == null) return "Just now";
    try {
      DateTime dt;
      if (ts is num) {
        dt = DateTime.fromMillisecondsSinceEpoch(ts.toInt());
      } else if (ts is String) {
        dt = DateTime.tryParse(ts) ?? DateTime.now();
      } else {
        dt = DateTime.now();
      }
      return DateFormat('HH:mm:ss').format(dt);
    } catch (_) {
      return ts.toString();
    }
  }

  static String formatDate(dynamic ts) {
    if (ts == null) return "--";
    try {
      DateTime dt = ts is String ? (DateTime.tryParse(ts) ?? DateTime.now()) : DateTime.now();
      return DateFormat('MMM dd, yyyy HH:mm').format(dt);
    } catch (_) {
      return ts.toString();
    }
  }

  /// Masks patient name for lock-screen privacy or unauthenticated views
  static String maskName(String? name) {
    if (name == null || name.isEmpty) return "Anonymous";
    final parts = name.split(' ');
    return parts.map((part) {
      if (part.length <= 1) return part;
      return '${part[0]}${'*' * (part.length - 1)}';
    }).join(' ');
  }

  static String sanitizeUrl(String? url, {String defaultUrl = "http://100.86.143.62:8000"}) {
    if (url == null || url.trim().isEmpty) return defaultUrl;
    String clean = url.trim();
    if (clean.contains(".loca.lt:8000")) {
      clean = clean.replaceAll(".loca.lt:8000", ".loca.lt");
    }
    if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
      if (clean.contains("loca.lt") || clean.contains("ngrok") || clean.contains(".app") || clean.contains(".dev")) {
        clean = "https://$clean";
      } else {
        clean = "http://$clean";
      }
    }
    return clean.replaceAll(RegExp(r'/+$'), '');
  }
}
