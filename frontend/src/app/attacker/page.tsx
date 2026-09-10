"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import {
  Terminal,
  Cpu,
  Play,
  Square,
  User,
  Zap,
  ShieldAlert,
  ShieldCheck,
  Flame,
  Radio,
  RotateCcw,
  KeyRound,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Activity,
  Battery,
  Layers,
} from "lucide-react";

interface Patient {
  id: string;
  name: string;
  status: string;
  ward_number?: string;
  bed_number?: string;
}

interface AttackMethod {
  mode: string;
  label: string;
  category: "Layer 1: Medical Device & Physiology" | "Layer 2: Network & Protocol" | "Control";
  target: string;
  severity: "CRITICAL" | "HIGH" | "WARNING" | "SAFE";
  desc: string;
  reportScenario: string;
  payloadEffect: string;
}

const ATTACK_TYPES: AttackMethod[] = [
  // Layer 1 Medical & Device Attacks
  {
    mode: "Override",
    label: "Pacemaker & Infusion Override",
    category: "Layer 1: Medical Device & Physiology",
    target: "Pacemaker (Pacing Rate) & Infusion Pump",
    severity: "CRITICAL",
    desc: "Abnormally high or low pacing rate & medication overdose",
    reportScenario: "Report Table 6: 'Pacemaker override'",
    payloadEffect: "Forces Pacing=180 ppm, Infusion=500 mL/h. Vitals spike (HR=190 bpm, BP drops to 50 mmHg). Triggers IPS safe KVO fallback.",
  },
  {
    mode: "Drain",
    label: "Battery Depletion Exploit",
    category: "Layer 1: Medical Device & Physiology",
    target: "Internal Lithium Power Subsystem",
    severity: "HIGH",
    desc: "Rapid reduction in simulated battery level",
    reportScenario: "Report Table 6: 'Battery drain'",
    payloadEffect: "Forces continuous high-draw cycles draining 5% battery per second to induce abrupt clinical blackout.",
  },
  {
    mode: "Fault",
    label: "Sensor Detachment (Loose Lead Fault)",
    category: "Layer 1: Medical Device & Physiology",
    target: "ECG Lead II Biosensor Hardware",
    severity: "WARNING",
    desc: "Electrode contact failure & loose lead detachment",
    reportScenario: "Report Table 6: 'Sensor Failure'",
    payloadEffect: "Spikes lead impedance to 10,000 Ω. Layer 1 flags sensor fault and alerts nurse without blocking patient.",
  },

  // Layer 2 Network & Protocol Attacks
  {
    mode: "DoS",
    label: "DoS Volumetric Packet Flood",
    category: "Layer 2: Network & Protocol",
    target: "Telemetry Broker & Buffer Queue",
    severity: "HIGH",
    desc: "Excessive or disruptive network traffic",
    reportScenario: "Report Table 6: 'DoS'",
    payloadEffect: "Floods message broker with 450-byte telemetry packets exceeding 20 pkts/s to exhaust queue buffer.",
  },
  {
    mode: "MitM",
    label: "Telemetry Spoofing / MitM",
    category: "Layer 2: Network & Protocol",
    target: "HMAC-SHA256 Cryptographic Signature",
    severity: "CRITICAL",
    desc: "False or manipulated telemetry payload in transit",
    reportScenario: "Report Table 6: 'Spoofing'",
    payloadEffect: "Corrupts cryptographic HMAC signature keys and injects forged physiological vitals into the channel.",
  },
  {
    mode: "Replay",
    label: "Replay / Stale Data Injection",
    category: "Layer 2: Network & Protocol",
    target: "Timestamp Latency & Replay Window",
    severity: "HIGH",
    desc: "Previously observed or inconsistent values",
    reportScenario: "Report Table 6: 'Replay / abnormal data'",
    payloadEffect: "Captures and retransmits stale historical packets (>3000ms old) to mask genuine acute patient crisis.",
  },
  {
    mode: "BruteForce",
    label: "Brute-Force Authentication Attack",
    category: "Layer 2: Network & Protocol",
    target: "IoMT API Gateway Auth Service",
    severity: "CRITICAL",
    desc: "Repeated unauthorized access attempts",
    reportScenario: "Report Table 6: 'Brute-force activity'",
    payloadEffect: "Transmits rapid credential-stuffing and forged JWT requests to crack the medical telemetry gateway.",
  },
];

export default function AttackerHubPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [currentAttack, setCurrentAttack] = useState("Normal");
  const [activeTarget, setActiveTarget] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const addLog = (msg: string, type: "info" | "exploit" | "defense" | "error" = "info") => {
    const time = new Date().toLocaleTimeString();
    const prefix = type === "exploit" ? "[EXPLOIT]" : type === "defense" ? "[DEFENSE]" : type === "error" ? "[ERROR]" : "[SYS]";
    setLogs((prev) => [`${prefix} [${time}] ${msg}`, ...prev].slice(0, 50));
  };

  // Poll current attack state from backend
  const syncAttackState = async () => {
    try {
      const state = await fetchApi<{ attack_mode: string; target_patient: string }>("/security/attack");
      setCurrentAttack(state.attack_mode || "Normal");
      setActiveTarget(state.target_patient || "");
    } catch (e) {}
  };

  useEffect(() => {
    // Load patients
    fetchApi<Patient[]>("/patients")
      .then((data) => {
        setPatients(data);
        if (data.length > 0 && !selectedPatient) {
          setSelectedPatient(data[0].id);
        }
      })
      .catch(() => {});

    syncAttackState();
    addLog("TRINETRA C2 Attacker Hub initialized. Connected to 127.0.0.1:8000.", "info");
    addLog("All 6 Report attack vectors (Table 6) armed and ready for penetration testing.", "info");

    const timer = setInterval(() => {
      syncAttackState();
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  // Timer for active attack
  useEffect(() => {
    if (currentAttack !== "Normal") {
      const t = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
      return () => clearInterval(t);
    } else {
      setElapsedSeconds(0);
    }
  }, [currentAttack]);

  const handleTriggerAttack = async (mode: string) => {
    const isStopping = currentAttack === mode && mode !== "Normal";
    const nextMode = isStopping ? "Normal" : mode;
    const target = nextMode === "Normal" ? "" : selectedPatient;

    if (!target && nextMode !== "Normal") {
      alert("Please select a target patient from the list first.");
      return;
    }

    setLoading(true);
    try {
      await fetchApi("/security/attack", {
        method: "POST",
        body: JSON.stringify({
          attack_mode: nextMode,
          target_patient: target,
        }),
      });

      setCurrentAttack(nextMode);
      setActiveTarget(target);

      const targetPatientObj = patients.find((p) => p.id === selectedPatient);
      const targetName = targetPatientObj ? targetPatientObj.name : selectedPatient;

      if (nextMode === "Normal") {
        addLog(`Disengaged all attack payloads. ICU telemetry restored to normal baseline.`, "defense");
      } else {
        const attackObj = ATTACK_TYPES.find((a) => a.mode === nextMode);
        addLog(`LAUNCHED ${attackObj?.label || nextMode} against ${targetName} (${selectedPatient}).`, "exploit");
        addLog(`Target Subsystem: ${attackObj?.target} | Payload: ${attackObj?.payloadEffect}`, "exploit");
        addLog(`Triggered detection pipeline in TRINETRA IDS Engine...`, "defense");
      }
    } catch (err: any) {
      addLog(`Failed to deploy exploit: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDisengageAll = async () => {
    await handleTriggerAttack("Normal");
  };

  const activePatientName = patients.find((p) => p.id === activeTarget)?.name || activeTarget;
  const currentAttackObj = ATTACK_TYPES.find((a) => a.mode === currentAttack);

  return (
    <div className="min-h-screen bg-[#070B14] text-[#00FF66] font-mono p-6 flex flex-col justify-between select-none">
      {/* Top Header */}
      <div className="border-b border-[#00FF66]/30 pb-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-red-950/40 border border-red-500/50 text-red-500">
            <Terminal className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-widest text-white">TRINETRA C2 ATTACKER HUB</h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-red-600/30 text-red-400 border border-red-500/50 font-sans font-bold uppercase">
                Red Team Exploitation Console
              </span>
            </div>
            <p className="text-xs text-[#00FF66]/70 uppercase tracking-wider">
              IoMT Cyberattack Generator • Full Table 6 Specification Implementation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs bg-[#00FF66]/10 px-3 py-1.5 rounded border border-[#00FF66]/30">
            <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-pulse"></span>
            <span>Target: 127.0.0.1:8000</span>
          </div>

          <Link
            href="/attacker-pure-ml"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-cyan-950/60 border border-[#00E5FF]/60 text-[#00E5FF] hover:bg-cyan-900/60 text-xs font-bold transition-all shadow-md shadow-cyan-500/20"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Launch Pure ML Mode Hub</span>
          </Link>

          <button
            onClick={handleDisengageAll}
            className={`px-4 py-2 text-xs font-bold rounded uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md ${
              currentAttack !== "Normal"
                ? "bg-red-600 hover:bg-red-700 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                : "bg-[#1F2937] hover:bg-[#374151] text-gray-300 border border-gray-700"
            }`}
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Emergency Disengage All</span>
          </button>
        </div>
      </div>

      {/* Active Attack Banner */}
      {currentAttack !== "Normal" && (
        <div className="mb-6 p-4 rounded-lg bg-red-950/40 border-2 border-red-500 text-white flex flex-wrap items-center justify-between gap-4 shadow-[0_0_25px_rgba(239,68,68,0.35)] animate-pulse">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-red-400 animate-bounce" />
            <div>
              <div className="text-xs text-red-400 font-bold uppercase tracking-widest">
                ● ACTIVE CYBERATTACK IN PROGRESS
              </div>
              <div className="text-base font-bold text-white">
                {currentAttackObj?.label || currentAttack} — Targeting:{" "}
                <span className="text-[#39FF14] underline font-mono">{activePatientName} ({activeTarget})</span>
              </div>
              <div className="text-[11px] text-gray-300 mt-0.5 font-sans">
                {currentAttackObj?.payloadEffect}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right font-mono">
              <div className="text-xl font-bold text-red-400">{elapsedSeconds}s</div>
              <div className="text-[10px] text-gray-400 uppercase">Attack Duration</div>
            </div>
            <button
              onClick={handleDisengageAll}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded shadow uppercase tracking-wider flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5 fill-current" /> Stop Exploit
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Targets + Attack Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow mb-6">
        {/* Left Column: Target Patient Selector */}
        <div className="bg-[#0D1527] border border-[#00FF66]/20 rounded-lg p-5 space-y-4 shadow-md flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold border-b border-[#00FF66]/20 pb-2.5 flex items-center justify-between text-white">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#00FF66]" /> 1. TARGET ICU PATIENT
              </span>
              <span className="text-[10px] text-gray-400 font-normal">
                {patients.length} active nodes
              </span>
            </h2>

            <div className="space-y-2.5 mt-3 max-h-[500px] overflow-y-auto pr-1">
              {patients.length === 0 ? (
                <div className="text-xs text-red-400 p-4 border border-red-900/50 rounded bg-red-950/20">
                  No active patients found. Please admit a patient from the directory first.
                </div>
              ) : (
                patients.map((p) => {
                  const isSelected = selectedPatient === p.id;
                  const isTargeted = activeTarget === p.id && currentAttack !== "Normal";
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPatient(p.id)}
                      className={`p-3 rounded border text-xs cursor-pointer transition-all ${
                        isTargeted
                          ? "bg-red-950/30 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.3)] text-red-300"
                          : isSelected
                          ? "bg-[#00FF66]/15 border-[#00FF66] shadow-[0_0_10px_rgba(0,255,102,0.2)] text-white"
                          : "bg-[#131F37] border-gray-800 hover:border-[#00FF66]/50 text-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold">{p.name}</div>
                        {isTargeted && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-600 text-white font-bold animate-pulse">
                            UNDER ATTACK
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1 flex justify-between">
                        <span>ID: <code>{p.id}</code></span>
                        <span>Ward: {p.ward_number || "ICU"}-{p.bed_number || "01"}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#00FF66]/20 text-[11px] text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>Selected Target:</span>
              <span className="font-bold text-white">{selectedPatient || "--"}</span>
            </div>
            <div className="flex justify-between">
              <span>Current Status:</span>
              <span className={currentAttack !== "Normal" ? "text-red-400 font-bold" : "text-[#00FF66] font-bold"}>
                {currentAttack !== "Normal" ? `ATTACK (${currentAttack})` : "SECURE / NORMAL"}
              </span>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Attack Vectors Matrix */}
        <div className="lg:col-span-2 bg-[#0D1527] border border-[#00FF66]/20 rounded-lg p-5 space-y-4 shadow-md">
          <div className="border-b border-[#00FF66]/20 pb-2.5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold flex items-center gap-2 text-white">
              <Zap className="w-4 h-4 text-red-400" /> 2. DEPLOY CYBERATTACK SCENARIOS (TABLE 6)
            </h2>
            <span className="text-[11px] text-gray-400">
              Target: <code className="text-[#00FF66] font-bold">{selectedPatient || "None"}</code>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[550px] overflow-y-auto pr-1">
            {ATTACK_TYPES.map((a) => {
              const isActive = currentAttack === a.mode && (activeTarget === selectedPatient || !activeTarget);
              return (
                <div
                  key={a.mode}
                  className={`border rounded-lg p-4 flex flex-col justify-between gap-3 transition-all ${
                    isActive
                      ? "bg-red-950/30 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] text-red-300 ring-1 ring-red-500"
                      : "bg-[#131F37] border-gray-800 hover:border-[#00FF66]/40 text-gray-200"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-gray-400 font-sans uppercase tracking-wider">
                        {a.category}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-sans ${
                          a.severity === "CRITICAL"
                            ? "bg-red-600/30 text-red-400 border border-red-500/50"
                            : a.severity === "HIGH"
                            ? "bg-orange-600/30 text-orange-400 border border-orange-500/50"
                            : "bg-yellow-600/30 text-yellow-400 border border-yellow-500/50"
                        }`}
                      >
                        {a.severity}
                      </span>
                    </div>

                    <h3 className={`font-bold text-xs ${isActive ? "text-red-400" : "text-white"}`}>
                      {a.label}
                    </h3>

                    <p className="text-[11px] text-gray-300 leading-relaxed font-sans">
                      {a.desc}
                    </p>

                    <div className="p-2 rounded bg-black/40 border border-gray-800 text-[10px] space-y-0.5">
                      <div className="text-gray-400">
                        <span className="text-gray-500 font-semibold">Target:</span> {a.target}
                      </div>
                      <div className="text-gray-400">
                        <span className="text-gray-500 font-semibold">Effect:</span> {a.payloadEffect}
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={loading}
                    onClick={() => handleTriggerAttack(a.mode)}
                    className={`w-full py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow ${
                      isActive
                        ? "bg-red-600 hover:bg-red-700 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                        : "bg-[#0A101D] hover:bg-[#1E293B] text-[#00FF66] border border-[#00FF66]/40 hover:border-[#00FF66]"
                    }`}
                  >
                    {isActive ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" /> Disengage Exploit
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" /> Deploy Exploit Payload
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
      <div className="bg-[#05080F] border border-[#00FF66]/30 rounded-lg p-4 h-[160px] overflow-y-auto flex flex-col-reverse text-[11px] leading-relaxed shadow-inner font-mono">
        {logs.map((log, idx) => (
          <div
            key={idx}
            className={
              log.includes("[ERROR]")
                ? "text-red-500 font-bold"
                : log.includes("[EXPLOIT]")
                ? "text-red-400 font-semibold"
                : log.includes("[DEFENSE]")
                ? "text-[#3498DB] font-semibold"
                : "text-[#00FF66]"
            }
          >
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}
