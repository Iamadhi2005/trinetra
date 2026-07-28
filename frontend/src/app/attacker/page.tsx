"use client";

import React, { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { ShieldAlert, Terminal, Play, Square, User, Zap } from "lucide-react";

interface Patient {
  id: string;
  name: string;
  status: string;
}

const ATTACK_TYPES = [
  { mode: "Normal", label: "🟢 Normal Operation", desc: "Disable payloads & restore default state" },
  { mode: "DoS", label: "🔥 DoS Packet Flood", desc: "Flood broker with high-frequency telemetry packets" },
  { mode: "MitM", label: "📡 MitM Signature Spoof", desc: "Corrupt telemetry signature keys to check integrity" },
  { mode: "Replay", label: "🔄 Replay Delay Injection", desc: "Inject old packets with stale timestamps" },
  { mode: "Fault", label: "🔌 Sensor Detach Fault", desc: "Simulate physical sensor detachment / loose lead" },
  { mode: "Drain", label: "🔋 Battery Drain Exploit", desc: "Rapidly deplete IoMT device battery levels" },
  { mode: "Override", label: "⚠️ Physiological Override", desc: "Inject critical vital bounds (e.g. HR=190, SpO2=75%)" },
];

export default function AttackerHubPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [currentAttack, setCurrentAttack] = useState("Normal");
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // Load patients
    fetchApi<Patient[]>("/patients")
      .then((data) => {
        setPatients(data);
        if (data.length > 0) {
          setSelectedPatient(data[0].id);
        }
      })
      .catch(() => {});

    // Initial log
    addLog("System initialized. C2 console ready.");
  }, []);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${msg}`, ...prev].slice(0, 30));
  };

  const handleTriggerAttack = async (mode: string) => {
    if (!selectedPatient && mode !== "Normal") {
      alert("Please select a target patient first.");
      return;
    }

    try {
      await fetchApi("/security/attack", {
        method: "POST",
        body: JSON.stringify({
          attack_mode: mode,
          target_patient: mode === "Normal" ? "" : selectedPatient,
        }),
      });

      setCurrentAttack(mode);
      if (mode === "Normal") {
        addLog("payload: Restored ICU environment to Normal state.");
      } else {
        const targetName = patients.find(p => p.id === selectedPatient)?.name || selectedPatient;
        addLog(`exploit: Launched ${mode} payload against ${targetName} (${selectedPatient}).`);
      }
    } catch (err: any) {
      addLog(`error: Failed to transmit payload: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1D] text-[#00FF66] font-mono p-6 flex flex-col justify-between">
      {/* Top Header */}
      <div className="border-b border-[#00FF66]/30 pb-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal className="w-8 h-8 text-[#00FF66]" />
          <div>
            <h1 className="text-xl font-bold tracking-widest text-white">TRINETRA C2 ATTACKER HUB</h1>
            <p className="text-xs text-[#00FF66]/70 uppercase">ICU Node Command & Penetration Interface</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs bg-[#00FF66]/10 px-3 py-1.5 rounded border border-[#00FF66]/30">
          <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-pulse"></span>
          <span>Target Connected: 127.0.0.1</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow mb-6">
        {/* Target Configuration Card */}
        <div className="bg-[#111827] border border-[#00FF66]/20 rounded-lg p-5 space-y-4 shadow-md">
          <h2 className="text-sm font-bold border-b border-[#00FF66]/20 pb-2 flex items-center gap-2 text-white">
            <User className="w-4 h-4" /> 1. SELECT TARGET ICU PATIENT
          </h2>

          <div className="space-y-3">
            {patients.length === 0 ? (
              <div className="text-xs text-red-400">No active patients detected on target subnet.</div>
            ) : (
              patients.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPatient(p.id)}
                  className={`p-3 rounded border text-xs cursor-pointer transition-all ${
                    selectedPatient === p.id
                      ? "bg-[#00FF66]/15 border-[#00FF66] shadow-[0_0_10px_rgba(0,255,102,0.2)]"
                      : "bg-[#1F2937] border-transparent hover:border-[#00FF66]/50"
                  }`}
                >
                  <div className="font-bold text-white">{p.name}</div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    ID: <code>{p.id}</code> | Status: {p.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Attack Vector Switches */}
        <div className="lg:col-span-2 bg-[#111827] border border-[#00FF66]/20 rounded-lg p-5 space-y-4 shadow-md">
          <h2 className="text-sm font-bold border-b border-[#00FF66]/20 pb-2 flex items-center gap-2 text-white">
            <Zap className="w-4 h-4" /> 2. INJECT CYBER-PHYSICAL PAYLOADS
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ATTACK_TYPES.map((a) => {
              const isActive = currentAttack === a.mode;
              return (
                <div
                  key={a.mode}
                  className={`border rounded-lg p-4 flex flex-col justify-between gap-3 transition-all ${
                    isActive
                      ? "bg-red-950/20 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.25)] text-red-400"
                      : "bg-[#1F2937] border-transparent hover:border-[#00FF66]/30 text-[#00FF66]"
                  }`}
                >
                  <div>
                    <h3 className={`font-bold text-sm ${isActive ? "text-red-400" : "text-white"}`}>
                      {a.label}
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                      {a.desc}
                    </p>
                  </div>

                  <button
                    onClick={() => handleTriggerAttack(a.mode)}
                    className={`w-full py-1.5 rounded text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors ${
                      isActive
                        ? "bg-red-600 hover:bg-red-700 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                        : "bg-[#111827] hover:bg-[#0A0F1D] text-[#00FF66] border border-[#00FF66]/30"
                    }`}
                  >
                    {isActive ? (
                      <>
                        <Square className="w-3 h-3 fill-current" /> Stop Payload
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" /> Execute Exploit
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Terminal Log Console */}
      <div className="bg-black border border-[#00FF66]/30 rounded p-4 h-[180px] overflow-y-auto flex flex-col-reverse text-[11px] leading-relaxed shadow-inner">
        {logs.map((log, idx) => (
          <div key={idx} className={log.includes("error") ? "text-red-500" : log.includes("exploit") ? "text-red-400" : "text-[#00FF66]"}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}
