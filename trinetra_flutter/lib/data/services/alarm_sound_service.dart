import 'package:audioplayers/audioplayers.dart';
import '../../core/utils/logger.dart';

class AlarmSoundService {
  static final AudioPlayer _player = AudioPlayer();
  static bool _isPlaying = false;
  static bool _contextConfigured = false;

  static Future<void> _ensureAudioContext() async {
    if (_contextConfigured) return;
    try {
      await AudioPlayer.global.setAudioContext(
        AudioContext(
          android: const AudioContextAndroid(
            isSpeakerphoneOn: true,
            stayAwake: true,
            contentType: AndroidContentType.sonification,
            usageType: AndroidUsageType.alarm,
            audioFocus: AndroidAudioFocus.gainTransientExclusive,
          ),
          iOS: AudioContextIOS(
            category: AVAudioSessionCategory.playback,
            options: const {
              AVAudioSessionOptions.duckOthers,
              AVAudioSessionOptions.defaultToSpeaker,
            },
          ),
        ),
      );
      _contextConfigured = true;
    } catch (e) {
      AppLogger.warn('AudioContext configuration note: $e');
    }
  }

  static Future<void> playEmergencyBeep() async {
    if (_isPlaying) return;
    _isPlaying = true;
    try {
      await _ensureAudioContext();
      await _player.stop();
      await _player.setVolume(1.0);
      await _player.play(AssetSource('sounds/beep_alert.wav'));
    } catch (e) {
      AppLogger.warn('Audio playback error: $e');
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
