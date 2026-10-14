"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Cpu,
  CheckCircle2,
  SlidersHorizontal,
  ArrowRight,
  Square,
  Activity,
  ShieldCheck,
} from "lucide-react";
import { fetchApi } from "@/lib/api";

export default function AttackerPureMLRedirectPage() {
  const [hubOnline, setHubOnline] = useState<boolean | null>(null);
  const [currentAttack, setCurrentAttack] = useState<string>("Normal");
  const [targetPatient, setTargetPatient] = useState<string>("");
  const [disengaging, setDisengaging] = useState<boolean>(false);

  useEffect(() => {
    fetch("http://localhost:3002", { mode: "no-cors" })
      .then(() => setHubOnline(true))
      .catch(() => setHubOnline(false));

    fetchApi<{ attack_mode: string; target_patient: string }>("/security/attack")
      .then((data) => {
        setCurrentAttack(data.attack_mode || "Normal");
        setTargetPatient(data.target_patient || "");
      })
      .catch(() => {});
  }, []);

  const handleDisengage = async () => {
    setDisengaging(true);
    try {
      await fetchApi("/security/disengage", { method: "POST" });
      setCurrentAttack("Normal");
      setTargetPatient("");
    } catch (e) {
    } finally {
      setDisengaging(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Header Breadcrumb */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-sans">
              Model Evaluation Suite
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs font-medium text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Scikit-Learn Inference Lab
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#002855] tracking-tight">
            Machine Learning Testbed (Port 3002)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Interactive mathematical feature synthesis and probability analysis hosted on the dedicated evaluation platform.
          </p>
        </div>

        <Link
          href="/"
          className="text-xs font-semibold text-[#002855] hover:text-[#001D40] bg-white border border-gray-200 px-3.5 py-2 rounded-lg shadow-sm transition-all"
        >
          ← Return to Hospital Command
        </Link>
      </div>

      {/* Main Callout Card */}
      <div className="bg-white text-gray-900 rounded-2xl p-8 border border-gray-200 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                  Real-Time Model Analysis
                </div>
                <h2 className="text-xl font-bold text-[#002855]">
                  Pure ML What-If Laboratory
                </h2>
              </div>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              The Pure ML evaluation suite features continuous <strong>5-parameter sliders</strong> evaluating real Random Forest (<code className="text-blue-700">CIC-IoMT-2024</code>) and Isolation Forest models. This research laboratory runs inside the <strong>Security Testbed on Port 3002</strong>.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="flex items-center gap-2 text-xs bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg text-gray-700">
                <span
                  className={`w-2 h-2 rounded-full ${
                    hubOnline ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                <span>
                  Testbed Status:{" "}
                  <strong>
                    {hubOnline ? "Online (Port 3002)" : "Standby (Port 3002)"}
                  </strong>
                </span>
              </div>

              {currentAttack !== "Normal" && (
                <div className="flex items-center gap-2 text-xs bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg text-rose-800">
                  <Activity className="w-3.5 h-3.5 text-rose-600" />
                  <span>
                    Active Scenario: <strong>{currentAttack}</strong> ({targetPatient || "Target"})
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2.5 w-full md:w-auto">
            <a
              href="http://localhost:3002"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-lg bg-[#002855] hover:bg-[#001D40] text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap"
            >
              <span>Open ML Testbed</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            {currentAttack !== "Normal" && (
              <button
                onClick={handleDisengage}
                disabled={disengaging}
                className="px-6 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs border border-gray-200 flex items-center justify-center gap-2 transition-all"
              >
                <Square className="w-3 h-3 text-rose-600" />
                <span>{disengaging ? "Resetting..." : "Reset to Normal Baseline"}</span>
              </button>
            )}

            <span className="text-center text-[11px] text-gray-400 font-mono">
              http://localhost:3002
            </span>
          </div>
        </div>
      </div>

      {/* Feature Capabilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-gray-900 text-sm mb-1">5-Feature What-If Sliders</h4>
          <p className="text-xs text-gray-500 leading-relaxed">
            Adjust Duration, Rate, Tot Size, Avg Size, and IAT in real time to observe mathematical probability shifts without modifying database state.
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
            <Cpu className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-gray-900 text-sm mb-1">Live Model Inference</h4>
          <p className="text-xs text-gray-500 leading-relaxed">
            Direct output from Scikit-Learn Random Forest (<code className="text-blue-700">predict_proba</code>) and Isolation Forest (<code className="text-blue-700">score_samples</code>).
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-gray-900 text-sm mb-1">Automated IPS Verification</h4>
          <p className="text-xs text-gray-500 leading-relaxed">
            Verify that Zero-Trust IPS isolation activates strictly from mathematical probability thresholds.
          </p>
        </div>
      </div>

      {/* Launch Footer */}
      <div className="bg-[#F8FAFC] border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-gray-600">
          <strong>Interactive Model Testing:</strong> Explore continuous mathematical decision boundaries on the standalone platform.
        </div>
        <a
          href="http://localhost:3002"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-lg bg-[#002855] hover:bg-[#001D40] text-white text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap"
        >
          <span>Open ML Testbed (3002)</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
