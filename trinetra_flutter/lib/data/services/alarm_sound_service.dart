import 'package:audioplayers/audioplayers.dart';
import '../../core/utils/logger.dart';

class AlarmSoundService {
  static final AudioPlayer _player = AudioPlayer();
  static bool _isPlaying = false;

  static Future<void> playEmergencyBeep() async {
    if (_isPlaying) return;
    _isPlaying = true;
    try {
      await _player.stop();
      await _player.setVolume(1.0);
      await _player.play(AssetSource('sounds/beep_alert.wav'));
    } catch (e) {
      AppLogger.warn('Audio playback not supported or audio file missing: $e');
    } finally {
      Future.delayed(const Duration(seconds: 2), () {
        _isPlaying = false;
      });
    }
  }

  static Future<void> stop() async {
    try {
      await _player.stop();
      _isPlaying = false;
    } catch (_) {}
  }
}
