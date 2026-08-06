"use client";

import React, { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { AlertTriangle, Volume2, VolumeX } from "lucide-react";

export default function UrgentAlertBanner() {
  const [alertCount, setAlertCount] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    const checkQuarantine = async () => {
      try {
        const items = await fetchApi<any[]>("/security/quarantine");
        setAlertCount(items.length);
        if (items.length === 0) {
          setDismissed(false);
        }
      } catch (err) {
        setAlertCount(0);
      }
    };

    checkQuarantine();
    const interval = setInterval(checkQuarantine, 3000);
    return () => clearInterval(interval);
  }, []);

  // Web Audio API Alarm Synthesizer
  useEffect(() => {
    if (alertCount > 0 && !isMuted && !dismissed) {
      let audioCtx: AudioContext | null = null;
      let intervalId: any = null;

      try {
        intervalId = setInterval(() => {
          if (!audioCtx) {
            audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          }
          if (audioCtx.state === "suspended") {
            audioCtx.resume();
          }
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "sine";
          osc.frequency.value = 880; // A5 pitch
          gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.4);
        }, 1200);
      } catch (e) {}

      return () => {
        if (intervalId) clearInterval(intervalId);
        if (audioCtx) audioCtx.close();
      };
    }
  }, [alertCount, isMuted, dismissed]);

  if (alertCount === 0 || dismissed) return null;

  return (
    <div className="bg-[#78281F] text-[#F1948A] border-b-2 border-[#EC7063] px-6 py-3 flex items-center justify-between shadow-lg animate-pulse">
      <div className="flex items-center gap-3 font-semibold text-sm">
        <AlertTriangle className="w-5 h-5 text-[#EC7063] animate-bounce" />
        <span>
          🚨 URGENT: {alertCount} CLINICAL THREATS DETECTED & ISOLATED IN SOFT QUARANTINE!
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="flex items-center gap-1.5 px-3 py-1 bg-[#922B21] hover:bg-[#A93226] text-white rounded text-xs font-semibold transition-colors"
        >
          {isMuted ? (
            <>
              <VolumeX className="w-3.5 h-3.5" />
              <span>Unmute Alarm</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5" />
              <span>Mute Sound</span>
            </>
          )}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="px-2.5 py-1 bg-black/30 hover:bg-black/50 text-white rounded text-xs font-semibold transition-colors"
          title="Dismiss Banner"
        >
          ✕ Dismiss
        </button>
      </div>
    </div>
  );
}
