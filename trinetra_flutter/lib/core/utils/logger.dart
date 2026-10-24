import 'package:flutter/foundation.dart';

class AppLogger {
  static void info(String message) {
    if (kDebugMode) {
      print('ℹ️ [TRINETRA INFO] $message');
    }
  }

  static void warn(String message) {
    if (kDebugMode) {
      print('⚠️ [TRINETRA WARN] $message');
    }
  }

  static void error(String message, [dynamic error, StackTrace? stack]) {
    if (kDebugMode) {
      print('🚨 [TRINETRA ERROR] $message');
      if (error != null) print('   Details: $error');
      if (stack != null) print('   Stack: $stack');
    }
  }

  static void defense(String message) {
    if (kDebugMode) {
      print('🛡️ [TRINETRA ZERO-TRUST] $message');
    }
  }
}
