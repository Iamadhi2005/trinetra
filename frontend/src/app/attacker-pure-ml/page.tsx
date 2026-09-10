"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import {
  Terminal,
  Cpu,
  ShieldAlert,
  ShieldCheck,
  Play,
  Square,
  Activity,
  Zap,
  Sliders,
  RefreshCw,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Radio,
  SlidersHorizontal,
  Flame,
  Info,
} from "lucide-react";

interface Patient {
  id: string;
  name: string;
  status: string;
  ward_number?: string;
  bed_number?: string;
}

interface MLDiagnostics {
  l2_network?: {
    features?: {
      duration: number;
      rate: number;
      tot_size: number;
      avg_size: number;
      iat: number;
    };
    rf_pred?: number;
    rf_prob_attack?: number;
    rf_prob_benign?: number;
    is_anomaly?: boolean;
  };
  l1_physiological?: {
    features?: {
      heart_rate: number;
      spo2: number;
      lead_impedance: number;
      infusion_rate: number;
    };
    if_pred?: number;
    if_anomaly_score?: number;
    is_anomaly?: boolean;
  };
  system_mode?: string;
  last_decision?: string;
  client_id?: string;
  device_id?: string;
  patient_id?: string;
  timestamp?: number;
}

interface WhatIfResult {
  layer_1_isolation_forest?: {
    pred: number;
    score: number;
    is_anomaly: boolean;
  };
  layer_2_random_forest?: {
    pred: number;
    prob_attack: number;
    prob_benign: number;
    is_anomaly: boolean;
  };
  overall_decision?: string;
}

export default function PureMLAttackerHubPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [systemMode, setSystemMode] = useState("pure_ml");
  const [currentAttack, setCurrentAttack] = useState("Normal");
  const [diagnostics, setDiagnostics] = useState<MLDiagnostics | null>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // What-If Playground States
  const [sliderHR, setSliderHR] = useState(75);
  const [sliderSpO2, setSliderSpO2] = useState(98);
  const [sliderInfusion, setSliderInfusion] = useState(5.0);
  const [sliderPacketRate, setSliderPacketRate] = useState(5);
  const [whatIfResult, setWhatIfResult] = useState<WhatIfResult | null>(null);
  const [evaluatingWhatIf, setEvaluatingWhatIf] = useState(false);

  const addLog = (msg: string, type: "info" | "exploit" | "ml" | "alert" = "info") => {
    const time = new Date().toLocaleTimeString();
    const prefix =
      type === "exploit" ? "[EXPLOIT]" : type === "ml" ? "[ML-INFERENCE]" : type === "alert" ? "[QUARANTINE]" : "[SYSTEM]";
    setLogs((prev) => [`${prefix} [${time}] ${msg}`, ...prev].slice(0, 40));
  };

  // Poll system mode & diagnostics
  const refreshDiagnostics = async () => {
    try {
      const modeData = await fetchApi<{ system_mode: string; attack_mode: string; target_patient: string }>(
        "/security/mode"
      );
      setSystemMode(modeData.system_mode || "pure_ml");
      setCurrentAttack(modeData.attack_mode || "Normal");

      const diagData = await fetchApi<{ diagnostics: MLDiagnostics }>("/security/pure-ml/diagnostics");
      if (diagData && diagData.diagnostics) {
        setDiagnostics(diagData.diagnostics);
      }
    } catch (e) {}
  };

  // Initial load
  useEffect(() => {
    fetchApi<Patient[]>("/patients")
      .then((data) => {
        setPatients(data);
        if (data.length > 0 && !selectedPatient) {
          setSelectedPatient(data[0].id);
        }
      })
      .catch(() => {});

    // Ensure system is in pure_ml mode when visiting this hub
    fetchApi("/security/mode", {
      method: "POST",
      body: JSON.stringify({ mode: "pure_ml" }),
    }).catch(() => {});

    addLog("TRINETRA Pure ML Adversarial Console Initialized.", "info");
    addLog("System Operational Mode: PURE ML (All synthetic cheats & forced alerts DISABLED).", "ml");
    addLog("Scikit-Learn model_l1.joblib (Isolation Forest) & model_l2.joblib (Random Forest) active.", "ml");

    refreshDiagnostics();
    const interval = setInterval(refreshDiagnostics, 1500);
    return () => clearInterval(interval);
  }, []);

  // What-If live evaluator
  useEffect(() => {
    const runEvaluation = async () => {
      setEvaluatingWhatIf(true);
      try {
        const totSize = sliderPacketRate * 350;
        const res = await fetchApi<WhatIfResult>("/security/pure-ml/evaluate", {
          method: "POST",
          body: JSON.stringify({
            heart_rate: sliderHR,
            spo2: sliderSpO2,
            lead_impedance: 500.0,
            infusion_rate: sliderInfusion,
            duration: 1.0,
            rate: sliderPacketRate,
            tot_size: totSize,
            avg_size: 350,
            iat: sliderPacketRate > 1 ? 1.0 / (sliderPacketRate - 1) : 1.0,
          }),
        });
        setWhatIfResult(res);
      } catch (e) {
      } finally {
        setEvaluatingWhatIf(false);
      }
    };

    const debounceTimer = setTimeout(runEvaluation, 150);
    return () => clearTimeout(debounceTimer);
  }, [sliderHR, sliderSpO2, sliderInfusion, sliderPacketRate]);

  // Mode Switch Handler
  const handleToggleMode = async (targetMode: string) => {
    try {
      await fetchApi("/security/mode", {
        method: "POST",
        body: JSON.stringify({ mode: targetMode }),
      });
      setSystemMode(targetMode);
      addLog(`System mode switched to '${targetMode.toUpperCase()}'.`, "info");
    } catch (e) {}
  };

  // Pure ML Attack Launch
  const handleLaunchPureMLAttack = async (attackMode: string) => {
    const isStopping = currentAttack === attackMode && attackMode !== "Normal";
    const nextMode = isStopping ? "Normal" : attackMode;
    const target = nextMode === "Normal" ? "" : selectedPatient;

    if (!target && nextMode !== "Normal") {
      alert("Please select a target patient from the list first.");
      return;
    }

    setLoading(true);
    try {
      await fetchApi("/security/pure-ml/attack", {
        method: "POST",
        body: JSON.stringify({
          attack_mode: nextMode,
          target_patient: target,
        }),
      });

      setCurrentAttack(nextMode);

      if (nextMode === "Normal") {
        addLog("Disengaged adversarial stream. Normal physiological baseline restored.", "info");
      } else {
        addLog(`DEPLOYED Adversarial stream: ${nextMode} against ${target}.`, "exploit");
        addLog(`Zero synthetic shortcuts: Waiting for Scikit-Learn models to classify packet stream...`, "ml");
      }
      refreshDiagnostics();
    } catch (err: any) {
      addLog(`Failed to deploy adversarial stream: ${err.message}`, "info");
    } finally {
      setLoading(false);
    }
  };

  // Extract real diagnostics
  const rfProbAttack = diagnostics?.l2_network?.rf_prob_attack ?? 0.14;
  const rfPred = diagnostics?.l2_network?.rf_pred ?? 0;
  const isL2Anomaly = diagnostics?.l2_network?.is_anomaly ?? false;
  const flowRate = diagnostics?.l2_network?.features?.rate ?? 5.0;

  const ifScore = diagnostics?.l1_physiological?.if_anomaly_score ?? 0.2;
  const ifPred = diagnostics?.l1_physiological?.if_pred ?? 1;
  const isL1Anomaly = diagnostics?.l1_physiological?.is_anomaly ?? false;

  return (
    <div className="min-h-screen bg-[#070B14] text-white font-mono p-6 flex flex-col justify-between select-none">
      {/* Top Header */}
      <div>
        <div className="border-b border-[#00E5FF]/20 pb-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded bg-cyan-950/40 border border-[#00E5FF]/40 text-[#00E5FF]">
              <Cpu className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold tracking-wider text-white">
                  TRINETRA PURE ML ADVERSARIAL TESTBED
                </h1>
                <span className="text-[10px] px-2.5 py-0.5 rounded bg-cyan-500/20 text-[#00E5FF] border border-[#00E5FF]/40 font-bold uppercase tracking-wider">
                  Mathematical Inference Mode
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Strict Dual-Layer Machine Learning • Zero Scripted Database Cheats • Scikit-Learn Trained Models
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Link back to standard hub */}
            <Link
              href="/attacker"
              className="flex items-center gap-2 px-3.5 py-2 rounded border border-gray-700 bg-gray-900/60 hover:bg-gray-800 text-xs text-gray-300 transition-colors"
            >
              <span>Standard Attacker Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {/* Mode Switcher */}
            <div className="flex items-center bg-[#0B132B] border border-[#1E293B] rounded-lg p-1 text-xs">
              <button
                onClick={() => handleToggleMode("standard")}
                className={`px-3 py-1 rounded transition-colors ${
                  systemMode === "standard"
                    ? "bg-[#002855] text-white font-bold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Standard Mode
              </button>
              <button
                onClick={() => handleToggleMode("pure_ml")}
                className={`px-3 py-1 rounded transition-colors ${
                  systemMode === "pure_ml"
                    ? "bg-[#00E5FF] text-black font-bold shadow-lg shadow-cyan-500/30"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Pure ML Mode
              </button>
            </div>
          </div>
        </div>

        {/* Verification Guarantee Banner */}
        <div className="bg-[#0D1829] border border-[#00E5FF]/30 rounded-lg p-3.5 mb-6 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-[#00E5FF] flex-shrink-0" />
            <div className="text-gray-300">
              <span className="font-bold text-[#00E5FF]">Pure ML Guarantee: </span>
              In this mode, all synthetic database cheats, hardcoded thresholds, and <code className="text-[#FF3366]">attacker_node</code> biases are completely disabled. Alerts & Quarantine are triggered{" "}
              <span className="text-white font-bold underline">100% by mathematical classification outputs</span> of{" "}
              <code className="text-[#00E5FF]">model_l1.joblib</code> and <code className="text-[#00E5FF]">model_l2.joblib</code>.
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] animate-ping"></span>
            <span className="text-[11px] font-bold text-[#00E5FF] uppercase">Live Inference Engine</span>
          </div>
        </div>

        {/* Target Patient Selector */}
        <div className="bg-[#0D1527] border border-[#1E293B] rounded-lg p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Radio className="w-5 h-5 text-[#00E5FF]" />
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider">Select ICU Target Patient</div>
              <div className="text-[11px] text-gray-400">Streams live physiological data to Isolation Forest</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {patients.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPatient(p.id)}
                className={`px-4 py-2 rounded text-xs font-bold transition-all ${
                  selectedPatient === p.id
                    ? "bg-[#00E5FF] text-black shadow-md shadow-cyan-500/20 scale-105"
                    : "bg-[#1E293B]/60 text-gray-300 hover:bg-[#1E293B]"
                }`}
              >
                {p.name} ({p.id})
              </button>
            ))}
          </div>
        </div>

        {/* Main Grid: Live ML Diagnostics + Adversarial Attack Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* LEFT: Live Scikit-Learn Model Telemetry Cockpit */}
          <div className="bg-[#0B1120] border border-[#1E293B] rounded-xl p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2.5">
                <Cpu className="w-5 h-5 text-[#00E5FF]" />
                <h2 className="text-sm font-bold text-white tracking-wider">
                  LIVE SCIKIT-LEARN DIAGNOSTIC COCKPIT
                </h2>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                100% Real Weights
              </span>
            </div>

            {/* Layer 2 Random Forest Meter */}
            <div className="bg-[#070B14] border border-[#1E293B] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#00E5FF]">LAYER 2: RANDOM FOREST NETWORK CLASSIFIER</div>
                  <div className="text-[10px] text-gray-400">Trained on CIC-IoMT-2024 (50 Estimator Trees)</div>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded font-bold uppercase ${
                    isL2Anomaly
                      ? "bg-red-950 text-red-400 border border-red-500 animate-pulse"
                      : "bg-emerald-950 text-emerald-400 border border-emerald-500"
                  }`}
                >
                  {isL2Anomaly ? "ATTACK CLASSIFIED" : "BENIGN FLOW"}
                </span>
              </div>

              {/* Attack Probability Bar */}
              <div>
                <div className="flex justify-between text-[11px] mb-1 font-bold">
                  <span className="text-gray-400">Attack Probability: P(Attack)</span>
                  <span className={isL2Anomaly ? "text-red-400" : "text-emerald-400"}>
                    {(rfProbAttack * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-800 flex">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isL2Anomaly ? "bg-gradient-to-r from-yellow-500 to-red-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.max(5, rfProbAttack * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Flow Features Input Vector */}
              <div className="grid grid-cols-3 gap-2 text-[10px] bg-[#0D1527] p-2.5 rounded border border-[#1E293B]">
                <div>
                  <span className="text-gray-400">Flow Rate:</span>{" "}
                  <span className="font-bold text-white">{flowRate.toFixed(1)} pkts/s</span>
                </div>
                <div>
                  <span className="text-gray-400">Total Bytes:</span>{" "}
                  <span className="font-bold text-white">
                    {diagnostics?.l2_network?.features?.tot_size ?? 750} B
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">IAT:</span>{" "}
                  <span className="font-bold text-white">
                    {diagnostics?.l2_network?.features?.iat ?? 0.2}s
                  </span>
                </div>
              </div>
            </div>

            {/* Layer 1 Isolation Forest Meter */}
            <div className="bg-[#070B14] border border-[#1E293B] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#FFB800]">LAYER 1: ISOLATION FOREST PHYSIOLOGICAL GUARD</div>
                  <div className="text-[10px] text-gray-400">Trained on Patient Physiological Baseline Ensembles</div>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded font-bold uppercase ${
                    isL1Anomaly
                      ? "bg-red-950 text-red-400 border border-red-500 animate-pulse"
                      : "bg-emerald-950 text-emerald-400 border border-emerald-500"
                  }`}
                >
                  {isL1Anomaly ? "ANOMALY DETECTED" : "NORMAL INLIER"}
                </span>
              </div>

              {/* Anomaly Score */}
              <div>
                <div className="flex justify-between text-[11px] mb-1 font-bold">
                  <span className="text-gray-400">Isolation Score (Threshold: &lt; -0.500 is extreme outlier)</span>
                  <span className={isL1Anomaly ? "text-red-400" : "text-emerald-400"}>
                    {ifScore.toFixed(4)}
                  </span>
                </div>
                <div className="h-3 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-800 flex">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isL1Anomaly ? "bg-red-500" : "bg-emerald-500"
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(5, (1 - Math.abs(ifScore)) * 100))}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Vitals Input Vector */}
              <div className="grid grid-cols-4 gap-2 text-[10px] bg-[#0D1527] p-2.5 rounded border border-[#1E293B]">
                <div>
                  <span className="text-gray-400">HR:</span>{" "}
                  <span className="font-bold text-white">
                    {diagnostics?.l1_physiological?.features?.heart_rate ?? 75} bpm
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">SpO2:</span>{" "}
                  <span className="font-bold text-white">
                    {diagnostics?.l1_physiological?.features?.spo2 ?? 98}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Impedance:</span>{" "}
                  <span className="font-bold text-white">
                    {diagnostics?.l1_physiological?.features?.lead_impedance ?? 500} Ω
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Infusion:</span>{" "}
                  <span className="font-bold text-white">
                    {diagnostics?.l1_physiological?.features?.infusion_rate ?? 5} mL/h
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Adversarial Stream Launchpad */}
          <div className="bg-[#0B1120] border border-[#1E293B] rounded-xl p-5 space-y-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#1E293B] pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <Flame className="w-5 h-5 text-[#FF3366]" />
                  <h2 className="text-sm font-bold text-white tracking-wider">
                    PURE ADVERSARIAL STREAM LAUNCHPAD
                  </h2>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 font-bold">
                  Active: {currentAttack.toUpperCase()}
                </span>
              </div>

              <p className="text-xs text-gray-400 mb-4">
                Clicking an attack vector streams raw high-rate packets or manipulated telemetry. The Scikit-Learn models must detect it naturally.
              </p>

              {/* Attack Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* DoS */}
                <button
                  onClick={() => handleLaunchPureMLAttack("DoS")}
                  disabled={loading}
                  className={`p-3.5 rounded-lg border text-left transition-all ${
                    currentAttack === "DoS"
                      ? "bg-red-950/80 border-red-500 text-red-200 shadow-lg shadow-red-500/20"
                      : "bg-[#0D1527] border-[#1E293B] hover:border-[#FF3366] text-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-white">Volumetric Packet Flood</span>
                    <Zap className="w-4 h-4 text-[#FF3366]" />
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Sends real 450B packets &gt; 30 pkts/s to trigger Random Forest.
                  </div>
                </button>

                {/* Override */}
                <button
                  onClick={() => handleLaunchPureMLAttack("Override")}
                  disabled={loading}
                  className={`p-3.5 rounded-lg border text-left transition-all ${
                    currentAttack === "Override"
                      ? "bg-red-950/80 border-red-500 text-red-200 shadow-lg shadow-red-500/20"
                      : "bg-[#0D1527] border-[#1E293B] hover:border-[#FF3366] text-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-white">Medication Overdose (500 mL/h)</span>
                    <AlertTriangle className="w-4 h-4 text-[#FFB800]" />
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Sets infusion rate to 500 mL/h & HR to 180 to trigger Isolation Forest.
                  </div>
                </button>

                {/* Battery Drain */}
                <button
                  onClick={() => handleLaunchPureMLAttack("Drain")}
                  disabled={loading}
                  className={`p-3.5 rounded-lg border text-left transition-all ${
                    currentAttack === "Drain"
                      ? "bg-red-950/80 border-red-500 text-red-200 shadow-lg shadow-red-500/20"
                      : "bg-[#0D1527] border-[#1E293B] hover:border-[#FF3366] text-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-white">Cardiac Pacing Exhaustion</span>
                    <Activity className="w-4 h-4 text-[#00E5FF]" />
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Accelerates pacemaker pacing cycles to trigger anomalous draw.
                  </div>
                </button>

                {/* Loose Lead Fault */}
                <button
                  onClick={() => handleLaunchPureMLAttack("Fault")}
                  disabled={loading}
                  className={`p-3.5 rounded-lg border text-left transition-all ${
                    currentAttack === "Fault"
                      ? "bg-amber-950/80 border-amber-500 text-amber-200 shadow-lg shadow-amber-500/20"
                      : "bg-[#0D1527] border-[#1E293B] hover:border-amber-500 text-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-white">Lead Detachment (10,000 Ω)</span>
                    <Sliders className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Tests hardware lead detachment fault diagnosis vs cyberattack.
                  </div>
                </button>
              </div>
            </div>

            {/* Emergency Disengage Button */}
            <div className="pt-2">
              <button
                onClick={() => handleLaunchPureMLAttack("Normal")}
                disabled={loading}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-[#145A32] to-[#1E8449] hover:from-[#1E8449] hover:to-[#27AE60] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 transition-all uppercase tracking-wider"
              >
                <Square className="w-4 h-4" />
                <span>Disengage All Exploits &amp; Restore Baseline</span>
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Interactive "What-If" Parameter Playground */}
        <div className="bg-[#0B1120] border border-[#1E293B] rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-3 mb-5">
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal className="w-5 h-5 text-[#00E5FF]" />
              <div>
                <h3 className="text-sm font-bold text-white tracking-wider">
                  INTERACTIVE &quot;WHAT-IF&quot; ADVERSARIAL PLAYGROUND
                </h3>
                <p className="text-[11px] text-gray-400">
                  Drag the sliders below to feed live raw vectors into the Scikit-Learn models. Watch the decision boundary flip in real time.
                </p>
              </div>
            </div>

            {/* Live Verdict Tag */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Classification Verdict:</span>
              <span
                className={`text-xs px-3 py-1 rounded font-bold uppercase tracking-wider ${
                  whatIfResult?.overall_decision === "ANOMALY_QUARANTINE"
                    ? "bg-red-600 text-white shadow-lg shadow-red-500/30 animate-pulse"
                    : "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                }`}
              >
                {evaluatingWhatIf
                  ? "CALCULATING..."
                  : whatIfResult?.overall_decision === "ANOMALY_QUARANTINE"
                  ? "QUARANTINE (ATTACK)"
                  : "NORMAL TELEMETRY"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Slider 1: Heart Rate */}
            <div className="bg-[#070B14] p-3.5 rounded-lg border border-[#1E293B]">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-300 font-bold">Heart Rate</span>
                <span className="text-[#00E5FF] font-bold">{sliderHR} bpm</span>
              </div>
              <input
                type="range"
                min="40"
                max="200"
                value={sliderHR}
                onChange={(e) => setSliderHR(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#00E5FF]"
              />
              <div className="flex justify-between text-[9px] text-gray-500 mt-1">
                <span>40 (Bradycardia)</span>
                <span>Normal (75)</span>
                <span>200 (Tachycardia)</span>
              </div>
            </div>

            {/* Slider 2: SpO2 */}
            <div className="bg-[#070B14] p-3.5 rounded-lg border border-[#1E293B]">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-300 font-bold">Oxygen Saturation (SpO2)</span>
                <span className="text-[#00E5FF] font-bold">{sliderSpO2}%</span>
              </div>
              <input
                type="range"
                min="70"
                max="100"
                value={sliderSpO2}
                onChange={(e) => setSliderSpO2(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#00E5FF]"
              />
              <div className="flex justify-between text-[9px] text-gray-500 mt-1">
                <span>70% (Hypoxia)</span>
                <span>95% (Boundary)</span>
                <span>100% (Normal)</span>
              </div>
            </div>

            {/* Slider 3: Infusion Rate */}
            <div className="bg-[#070B14] p-3.5 rounded-lg border border-[#1E293B]">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-300 font-bold">Infusion Pump Rate</span>
                <span className="text-[#FFB800] font-bold">{sliderInfusion} mL/h</span>
              </div>
              <input
                type="range"
                min="1"
                max="500"
                value={sliderInfusion}
                onChange={(e) => setSliderInfusion(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#FFB800]"
              />
              <div className="flex justify-between text-[9px] text-gray-500 mt-1">
                <span>1.0 (KVO)</span>
                <span>5.0 (Clinical)</span>
                <span>500 (Overdose)</span>
              </div>
            </div>

            {/* Slider 4: Packet Frequency */}
            <div className="bg-[#070B14] p-3.5 rounded-lg border border-[#1E293B]">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-300 font-bold">Packet Frequency (Rate)</span>
                <span className="text-[#FF3366] font-bold">{sliderPacketRate} pkts/s</span>
              </div>
              <input
                type="range"
                min="1"
                max="120"
                value={sliderPacketRate}
                onChange={(e) => setSliderPacketRate(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#FF3366]"
              />
              <div className="flex justify-between text-[9px] text-gray-500 mt-1">
                <span>1 pkt/s</span>
                <span>20 (Normal)</span>
                <span>120 pkts/s (DoS)</span>
              </div>
            </div>
          </div>

          {/* What-If Live Mathematical Output */}
          <div className="mt-4 p-3 bg-[#070B14] rounded-lg border border-[#1E293B] flex flex-wrap items-center justify-between text-xs gap-4">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-gray-400">Random Forest P(Attack):</span>{" "}
                <span
                  className={`font-bold ${
                    (whatIfResult?.layer_2_random_forest?.prob_attack ?? 0) > 0.5
                      ? "text-red-400"
                      : "text-emerald-400"
                  }`}
                >
                  {((whatIfResult?.layer_2_random_forest?.prob_attack ?? 0) * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-gray-400">Isolation Forest Score:</span>{" "}
                <span
                  className={`font-bold ${
                    whatIfResult?.layer_1_isolation_forest?.is_anomaly
                      ? "text-red-400"
                      : "text-emerald-400"
                  }`}
                >
                  {(whatIfResult?.layer_1_isolation_forest?.score ?? 0).toFixed(4)}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-gray-400 italic">
              Evaluated directly against Scikit-Learn tree voting thresholds via /api/security/pure-ml/evaluate
            </div>
          </div>
        </div>

        {/* Real-time Terminal Log Console */}
        <div className="bg-[#050811] border border-[#1E293B] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#1E293B]">
            <Terminal className="w-4 h-4 text-[#00E5FF]" />
            <span className="text-xs font-bold text-gray-300">PURE ML INFERENCE LOG AUDIT STREAM</span>
          </div>
          <div className="h-32 overflow-y-auto space-y-1 text-[11px] text-gray-400 font-mono">
            {logs.map((log, i) => (
              <div
                key={i}
                className={
                  log.includes("[EXPLOIT]")
                    ? "text-[#FF3366]"
                    : log.includes("[ML-INFERENCE]")
                    ? "text-[#00E5FF]"
                    : log.includes("[QUARANTINE]")
                    ? "text-[#FFB800]"
                    : "text-gray-400"
                }
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
