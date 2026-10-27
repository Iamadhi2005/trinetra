/**
 * TRINETRA AlarmSoundService
 * Generates an immediate, piercing audible beep tone and emergency vibration pattern
 * whenever an IoMT attack or critical anomaly is identified.
 *
 * Audio Execution Strategy:
 *  1. Native Android: Uses NativeModules.BeepManager (hardware STREAM_ALARM tone + raw wav audio)
 *  2. Web Preview: Uses Web Audio API AudioContext oscillator (1000Hz -> 1200Hz -> 1500Hz staccato)
 *  3. Vibration: Android hardware vibrator staccato pattern [0, 400, 150, 400, 150, 600]
 */

import { NativeModules, Platform, Vibration } from "react-native";

class AlarmSoundService {
  private lastPlayedTime = 0;
  private audioCtx: any = null;

  /**
   * Plays the loud emergency beep tone immediately and triggers hardware vibration.
   * Debounced to 500ms to avoid audio engine stutter if multiple packets arrive.
   */
  public playEmergencyBeep(): void {
    const now = Date.now();
    if (now - this.lastPlayedTime < 500) return;
    this.lastPlayedTime = now;

    // 1. Hardware vibration pattern
    try {
      Vibration.vibrate([0, 450, 150, 450, 150, 650]);
    } catch (e) {
      // Ignore vibration errors
    }

    // 2. Platform-specific audio execution
    if (Platform.OS === "android") {
      this.playAndroidNativeBeep();
    } else if (Platform.OS === "web") {
      this.playWebSynthesizedBeep();
    } else {
      // iOS / other fallback
      this.playWebSynthesizedBeep();
    }
  }

  private playAndroidNativeBeep(): void {
    const { BeepManager } = NativeModules;
    if (BeepManager && typeof BeepManager.playEmergencyBeep === "function") {
      try {
        BeepManager.playEmergencyBeep();
        return;
      } catch (err) {
        console.warn("[AlarmSoundService] Native BeepManager error:", err);
      }
    }

    // If running inside Expo Go or before native build, try Web Audio or Audio fallback
    this.playWebSynthesizedBeep();
  }

  private playWebSynthesizedBeep(): void {
    try {
      if (typeof window === "undefined") return;
      const AudioContextClass =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx || this.audioCtx.state === "closed") {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      const startTime = ctx.currentTime;

      // 3 urgent medical warning beeps: 1000Hz, 1200Hz, 1500Hz
      const tones = [
        { freq: 1000, start: 0.0, dur: 0.15 },
        { freq: 1250, start: 0.22, dur: 0.15 },
        { freq: 1550, start: 0.44, dur: 0.25 },
      ];

      tones.forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sawtooth"; // Rich harmonic medical alarm tone
        osc.frequency.setValueAtTime(freq, startTime + start);

        gain.gain.setValueAtTime(0.01, startTime + start);
        gain.gain.linearRampToValueAtTime(0.35, startTime + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + start + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime + start);
        osc.stop(startTime + start + dur);
      });
    } catch (e) {
      // AudioContext unavailable or restricted by browser policy
    }
  }
}

export const alarmSound = new AlarmSoundService();
