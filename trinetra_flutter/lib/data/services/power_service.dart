import 'package:flutter/services.dart';
import '../../core/utils/logger.dart';

class PowerService {
  static const MethodChannel _channel = MethodChannel('com.trinetra.iomt/power');

  static Future<void> init() async {
    try {
      await _channel.invokeMethod('acquireWakeLock');
      final isIgnored = await _channel.invokeMethod<bool>('isBatteryOptimizationIgnored');
      if (isIgnored == false) {
        AppLogger.info('Requesting battery optimization exemption for background keepalive...');
        await _channel.invokeMethod('requestBatteryOptimizationExemption');
      }
    } catch (e) {
      AppLogger.warn('PowerService init note: $e');
    }
  }

  static Future<void> requestExemption() async {
    try {
      await _channel.invokeMethod('requestBatteryOptimizationExemption');
    } catch (_) {}
  }

  static Future<bool> isExempted() async {
    try {
      final isIgnored = await _channel.invokeMethod<bool>('isBatteryOptimizationIgnored');
      return isIgnored ?? false;
    } catch (_) {
      return false;
    }
  }
}
