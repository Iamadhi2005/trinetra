"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import {
  Activity,
  Users,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Heart,
  Droplet,
  Zap,
  Wifi,
  Cpu,
  Monitor,
  HeartPulse,
  Square,
  AlertOctagon,
  Lock,
  ExternalLink,
  CheckCircle2,
  X,
} from "lucide-react";
import Link from "next/link";

interface ActiveAttackInfo {
  is_active: boolean;
  attack_mode: string;
  attack_label: string;
  severity: string;
  target_patient_id?: string;
  target_patient_name?: string;
  ward_number?: string;
  bed_number?: string;
  target_device_id?: string;
  target_device_name?: string;
  target_device_type?: string;
  alert_message?: string;
  action_taken?: string;
  timestamp: number;
}

interface AlertItem {
  id: number;
  timestamp: string;
  device_id?: string;
  device_name?: string;
  device_type?: string;
  patient_id?: string;
  patient_name?: string;
  severity: string;
  message: string;
  status: string;
}

interface DashboardData {
  active_devices: number;
  patients_count: number;
  active_alerts_count: number;
  attacks_today: number;
  threat_level: string;
  network_health: string;
  uptime: string;
  active_attack?: ActiveAttackInfo;
  recent_alerts?: AlertItem[];
}

interface Patient {
  id: string;
  name: string;
  status: string;
  ward_number: string;
  bed_number: string;
  is_calibrated: boolean;
}

interface LiveVitalSummary {
  patient_id: string;
  name: string;
  heart_rate: number;
  spo2: number;
  status: string;
  is_calibrated: boolean;
  is_under_attack: boolean;
  attack_type?: string;
  active_attack_mode?: string;
  active_target_patient?: string;
  machine_id?: string;
  machine_name?: string;
  machine_type?: string;
  patient_name?: string;
  ward_number?: string;
  bed_number?: string;
  attack_severity?: string;
  attack_message?: string;
  action_taken?: string;
}

function MiniEcgStrip({ hr, isCritical }: { hr: number; isCritical?: boolean }) {
  return (
    <div className="w-full h-7 bg-black/90 rounded border border-gray-900 px-2 flex items-center justify-between overflow-hidden relative my-1">
      <span className="text-[8px] text-[#39FF14] font-bold font-mono tracking-wider absolute left-1.5 top-0.5 z-10 opacity-80">
        ECG LEAD II
      </span>
      <svg className="w-full h-5 mt-1.5" viewBox="0 0 200 24" preserveAspectRatio="none">
        <path
          d="M 0 12 L 15 12 L 20 10 L 24 14 L 28 12 L 40 12 L 44 14 L 48 2 L 52 22 L 56 9 L 60 13 L 64 12 L 76 12 L 84 10 L 92 12 L 104 12 L 108 10 L 112 14 L 116 12 L 128 12 L 132 14 L 136 2 L 140 22 L 144 9 L 148 13 L 152 12 L 164 12 L 172 10 L 180 12 L 200 12"
          fill="none"
          stroke={isCritical ? "#EF4444" : "#39FF14"}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-pulse"
        />
      </svg>
    </div>
  );
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [liveVitals, setLiveVitals] = useState<Record<string, LiveVitalSummary>>({});
  const [mounted, setMounted] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch Dashboard Metrics
  const { data: metrics, isLoading: isMetricsLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard-metrics"],
    queryFn: () => fetchApi<DashboardData>("/dashboard"),
    refetchInterval: 2000,
    enabled: mounted,
  });

  // Fetch Patients List
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["patients"],
    queryFn: () => fetchApi<Patient[]>("/patients"),
    enabled: mounted,
  });

  // Maintain active WebSockets for all calibrated patients to render central ICU telemetry panel
  useEffect(() => {
    if (!mounted || patients.length === 0) return;

    const sockets: Record<string, WebSocket> = {};

    patients.forEach((p) => {
      if (!p.is_calibrated) return;

      const ws = new WebSocket(`ws://localhost:8000/ws/telemetry/${p.id}`);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLiveVitals((prev) => ({
            ...prev,
            [p.id]: {
              patient_id: p.id,
              name: data.patient_name || p.name,
              heart_rate: data.heart_rate,
              spo2: data.spo2,
              status: data.status,
              is_calibrated: true,
              is_under_attack: !!data.is_under_attack,
              attack_type: data.attack_type,
              active_attack_mode: data.active_attack_mode,
              machine_id: data.machine_id,
              machine_name: data.machine_name,
              machine_type: data.machine_type,
              patient_name: data.patient_name,
              ward_number: data.ward_number,
              bed_number: data.bed_number,
              attack_severity: data.attack_severity,
              attack_message: data.attack_message,
              action_taken: data.action_taken,
            },
          }));
        } catch (e) {}
      };
      sockets[p.id] = ws;
    });

    return () => {
      Object.values(sockets).forEach((ws) => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => ws.close();
        } else if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });
    };
  }, [patients, mounted]);

  // Isolate machine action
  const handleIsolateMachine = async (deviceId: string) => {
    try {
      await fetchApi("/security/quarantine/action", {
        method: "POST",
        body: JSON.stringify({ device_id: deviceId, action: "hard_block" }),
      });
      setActionMessage(`Machine ${deviceId} isolated and placed in hard block.`);
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage(`Action failed: ${err.message}`);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  // Neutralize attack action
  const handleNeutralizeAttack = async () => {
    try {
      await fetchApi("/security/attack", {
        method: "POST",
        body: JSON.stringify({ attack_mode: "Normal", target_patient: "" }),
      });
      setActionMessage("Attack disengaged. System restored to baseline.");
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage(`Neutralization failed: ${err.message}`);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  if (!mounted) {
    return <div className="text-xs text-[#718096]">Loading central telemetry station...</div>;
  }

  // Detect live active attack from either WebSocket telemetry or polled dashboard metrics
  const liveAttackVital = Object.values(liveVitals).find((v) => v.is_under_attack);
  const metricsAttack = metrics?.active_attack?.is_active ? metrics.active_attack : null;

  const isUnderAttack = !!(liveAttackVital || metricsAttack);
  const attackMode = liveAttackVital?.active_attack_mode || metricsAttack?.attack_mode || "Normal";
  const attackLabel = liveAttackVital?.attack_type || metricsAttack?.attack_label || "Cyber-Physical Intrusion";
  const machineName = liveAttackVital?.machine_name || metricsAttack?.target_device_name || "Target Medical Device";
  const machineId = liveAttackVital?.machine_id || metricsAttack?.target_device_id || "device_unknown";
  const machineType = liveAttackVital?.machine_type || metricsAttack?.target_device_type || "Medical Device";
  const patientName = liveAttackVital?.patient_name || metricsAttack?.target_patient_name || "Admitted Patient";
  const patientId = liveAttackVital?.patient_id || metricsAttack?.target_patient_id || "patient_unknown";
  const wardNumber = liveAttackVital?.ward_number || metricsAttack?.ward_number || "ICU-A";
  const bedNumber = liveAttackVital?.bed_number || metricsAttack?.bed_number || "Bed-01";
  const attackSeverity = liveAttackVital?.attack_severity || metricsAttack?.severity || "Critical";
  const actionTaken = liveAttackVital?.action_taken || metricsAttack?.action_taken || "Quarantined by IPS";
  const alertMessage =
    liveAttackVital?.attack_message ||
    metricsAttack?.alert_message ||
    `🚨 [${attackSeverity.toUpperCase()} ALERT] ${attackLabel} detected on Machine: '${machineName}' (${machineId}) | Target Patient: '${patientName}' (${patientId}, Ward: ${wardNumber}, Bed: ${bedNumber}). Action: ${actionTaken}.`;

  const attackKey = `${attackMode}_${patientId}_${machineId}`;
  const isBannerDismissed = dismissedKey === attackKey;

  const activeMonitoringCount = Object.values(liveVitals).filter((v) => v.is_calibrated).length;
  const criticalPatientsCount = Object.values(liveVitals).filter(
    (v) => v.heart_rate > 100 || v.heart_rate < 55 || v.spo2 < 93
  ).length;

  return (
    <div className="space-y-6">
      {/* Action Notification Toast */}
      {actionMessage && (
        <div className="bg-[#1E293B] border border-[#38BDF8] text-[#38BDF8] px-4 py-2 rounded text-xs font-semibold flex items-center justify-between shadow-lg">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SUDDEN EMERGENCY ATTACK ALERT BANNER */}
      {isUnderAttack && !isBannerDismissed && (
        <div className="relative overflow-hidden bg-gradient-to-r from-red-950 via-[#78281F] to-red-950 border-2 border-red-500 rounded-xl p-5 shadow-[0_0_30px_rgba(239,68,68,0.4)] transition-all animate-pulse">
          {/* Top Alert Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-red-500/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-600/30 border border-red-500 text-red-300">
                <AlertOctagon className="w-7 h-7 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black tracking-wider text-white uppercase">
                    🚨 INTRUSION ALERT: ACTIVE CYBERATTACK DETECTED
                  </h2>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-red-600 text-white uppercase tracking-widest animate-ping">
                    LIVE
                  </span>
                </div>
                <p className="text-xs text-red-200 mt-0.5">
                  Real-time intrusion detection pipeline has flagged malicious activity on the clinical IoMT subnet.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded bg-red-900 border border-red-400 text-red-100 uppercase tracking-wider">
                SEVERITY: {attackSeverity}
              </span>
              <button
                onClick={() => setDismissedKey(attackKey)}
                title="Acknowledge alert"
                className="text-red-300 hover:text-white p-1 rounded hover:bg-red-900/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 4 Core Attribution Metric Cards: Attack Type, Machine, Patient, Mitigation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-4">
            {/* 1. Attack Vector */}
            <div className="bg-[#110505]/80 border border-red-500/40 rounded-lg p-3">
              <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Attack Vector
              </div>
              <div className="text-sm font-black text-white mt-1 leading-tight">{attackLabel}</div>
              <div className="text-[10px] text-red-300 mt-1 font-mono">Mode: {attackMode}</div>
            </div>

            {/* 2. Compromised Machine */}
            <div className="bg-[#110505]/80 border border-amber-500/40 rounded-lg p-3">
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> Compromised Machine
              </div>
              <div className="text-sm font-black text-white mt-1 leading-tight">{machineName}</div>
              <div className="text-[10px] text-amber-300 mt-1 font-mono">
                ID: <code>{machineId}</code> ({machineType})
              </div>
            </div>

            {/* 3. Target Patient */}
            <div className="bg-[#110505]/80 border border-blue-500/40 rounded-lg p-3">
              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Target Patient
              </div>
              <div className="text-sm font-black text-white mt-1 leading-tight">{patientName}</div>
              <div className="text-[10px] text-blue-300 mt-1 font-mono">
                ID: <code>{patientId}</code> | {wardNumber}-{bedNumber}
              </div>
            </div>

            {/* 4. Defense Action */}
            <div className="bg-[#110505]/80 border border-emerald-500/40 rounded-lg p-3">
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Automated IPS Action
              </div>
              <div className="text-sm font-black text-white mt-1 leading-tight">{actionTaken}</div>
              <div className="text-[10px] text-emerald-300 mt-1">Rule Triggered & Enforced</div>
            </div>
          </div>

          {/* Alert Message Box */}
          <div className="bg-[#0A0202] border border-red-500/30 rounded p-2.5 font-mono text-xs text-red-200 flex items-start gap-2">
            <span className="text-red-400 font-bold shrink-0">LOG:</span>
            <span>{alertMessage}</span>
          </div>

          {/* Direct Incident Mitigation Action Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-red-500/30">
            <div className="text-xs text-red-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
              <span>Immediate Response Actions Available</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleIsolateMachine(machineId)}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Lock className="w-3.5 h-3.5" /> Isolate Machine ({machineId})
              </button>

              <button
                onClick={handleNeutralizeAttack}
                className="px-3.5 py-1.5 bg-[#1F2937] hover:bg-[#374151] border border-gray-600 text-gray-200 font-bold text-xs rounded uppercase tracking-wider flex items-center gap-1.5 transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" /> Neutralize Attack
              </button>

              <Link
                href="/security"
                className="px-3.5 py-1.5 bg-[#002855] hover:bg-[#1A3F6B] border border-[#3498DB] text-[#3498DB] font-bold text-xs rounded uppercase tracking-wider flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Security Hub
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Central Monitor Header Banner */}
      <div
        className={`text-white p-4 rounded-lg flex flex-wrap items-center justify-between gap-3 shadow-sm border transition-all ${
          isUnderAttack
            ? "bg-gradient-to-r from-[#78281F] via-[#900C3F] to-[#002855] border-red-500"
            : "bg-[#002855] border-[#1A3F6B]"
        }`}
      >
        <div>
          <h1 className="text-base font-bold uppercase tracking-wider flex items-center gap-2">
            <Monitor className="w-5 h-5 text-[#3498DB] animate-pulse" /> ICU Central Monitoring Station
          </h1>
          <p className="text-[11px] text-[#A0AEC0] uppercase tracking-widest mt-0.5">
            Real-time Clinical Telemetry Gate & Network Integrity Guard
          </p>
        </div>

        {isUnderAttack ? (
          <div className="flex items-center gap-2 text-xs font-bold bg-red-900/90 text-white px-3 py-1.5 rounded border border-red-400 animate-pulse">
            <AlertOctagon className="w-4 h-4 text-red-300" />
            <span>
              🚨 ATTACK ACTIVE: {attackLabel} ON {machineName} ({patientName})
            </span>
          </div>
        ) : (
          <div className="text-xs font-semibold bg-[#001D40] px-3 py-1 rounded border border-[#1A3F6B] text-[#2ECC71]">
            ● SYSTEM RUNNING SMOOTHLY
          </div>
        )}
      </div>

      {/* Clinical KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Admitted */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="text-[10px] font-bold text-[#718096] uppercase tracking-wider">Total Patients</div>
          <div className="text-xl font-bold text-[#0F172A] mt-1">{isMetricsLoading ? "--" : metrics?.patients_count}</div>
          <div className="text-[10px] text-[#718096] mt-1">Admitted Registry</div>
        </div>

        {/* Connected Nodes */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="text-[10px] font-bold text-[#718096] uppercase tracking-wider">Connected Devices</div>
          <div className="text-xl font-bold text-[#0F172A] mt-1">{isMetricsLoading ? "--" : metrics?.active_devices}</div>
          <div className="text-[10px] text-[#2ECC71] font-semibold mt-1">Online Telemetry</div>
        </div>

        {/* Active Telemetry Sessions */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="text-[10px] font-bold text-[#718096] uppercase tracking-wider">Active Sessions</div>
          <div className="text-xl font-bold text-[#3498DB] mt-1">
            {activeMonitoringCount} / {metrics?.patients_count || 0}
          </div>
          <div className="text-[10px] text-[#3498DB] font-semibold mt-1">WebSocket Feeds</div>
        </div>

        {/* Critical Alerts */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="text-[10px] font-bold text-[#718096] uppercase tracking-wider">Critical Vitals</div>
          <div className={`text-xl font-bold mt-1 ${criticalPatientsCount > 0 ? "text-[#E74C3C]" : "text-[#2ECC71]"}`}>
            {criticalPatientsCount}
          </div>
          <div className="text-[10px] text-[#718096] mt-1">Vitals Out of Range</div>
        </div>

        {/* Device Alerts */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="text-[10px] font-bold text-[#718096] uppercase tracking-wider">Active Alerts</div>
          <div
            className={`text-xl font-bold mt-1 ${
              (metrics?.active_alerts_count || 0) > 0 ? "text-[#E74C3C]" : "text-[#2ECC71]"
            }`}
          >
            {metrics?.active_alerts_count}
          </div>
          <div className="text-[10px] text-[#718096] mt-1">Security / Device Warnings</div>
        </div>

        {/* Cybersecurity status */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="text-[10px] font-bold text-[#718096] uppercase tracking-wider">Cyber Threat Logs</div>
          <div className="text-xl font-bold text-[#0F172A] mt-1">{isMetricsLoading ? "--" : metrics?.attacks_today}</div>
          <div className="text-[10px] text-[#2ECC71] font-semibold mt-1">IPS Isolated Events</div>
        </div>
      </div>

      {/* ICU Central Telemetry Grid Display */}
      <div className="bg-[#0A0F1D] rounded-lg p-5 border border-[#00FF66]/20 shadow-md">
        <h2 className="text-[#00FF66] font-mono text-sm uppercase tracking-widest border-b border-[#00FF66]/20 pb-3 mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 animate-pulse" /> Live Telemetry Feed Matrix
          </span>
          {isUnderAttack && (
            <span className="text-xs text-red-400 bg-red-950/60 border border-red-500/50 px-2.5 py-0.5 rounded font-bold animate-pulse">
              🚨 TARGET IDENTIFIED: {patientName} ({machineName})
            </span>
          )}
        </h2>

        {patients.length === 0 ? (
          <div className="text-xs font-mono text-gray-500 py-12 text-center">
            No patients registered. Admitted ward subnet is empty.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patients.map((p) => {
              const live = liveVitals[p.id];
              const targetPat = live?.active_target_patient || metricsAttack?.target_patient_id;
              const isPatientUnderAttack = targetPat ? targetPat === p.id : (!!live?.is_under_attack);
              const isCriticalVitals = live && (live.heart_rate > 100 || live.heart_rate < 55 || live.spo2 < 93);


              return (
                <div
                  key={p.id}
                  className={`border rounded-lg p-4 font-mono text-xs flex flex-col justify-between min-h-[170px] transition-all ${
                    isPatientUnderAttack
                      ? "bg-red-950/40 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] ring-2 ring-red-500 animate-pulse"
                      : isCriticalVitals
                      ? "bg-red-950/10 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                      : "bg-[#111827] border-[#00FF66]/20"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-white font-bold text-sm tracking-wide flex items-center gap-1.5">
                        {p.name}
                        {isPatientUnderAttack && (
                          <span className="text-[9px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded uppercase animate-ping">
                            ALERT
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        ID: <code>{p.id}</code> | Ward: {p.ward_number}-{p.bed_number}
                      </div>
                    </div>

                    {isPatientUnderAttack ? (
                      <span className="text-red-400 bg-red-900/60 border border-red-500 px-2 py-0.5 rounded font-bold text-[10px] uppercase animate-pulse">
                        🚨 UNDER ATTACK
                      </span>
                    ) : p.is_calibrated ? (
                      <span className="text-[#00FF66] font-bold animate-pulse text-[10px]">● STREAMING</span>
                    ) : (
                      <span className="text-gray-500 font-bold text-[10px]">UNCALIBRATED</span>
                    )}
                  </div>

                  {/* Compromised Machine Callout when under attack */}
                  {isPatientUnderAttack && (
                    <div className="my-1.5 bg-red-900/50 border border-red-500/50 rounded px-2 py-1 text-[10px] text-red-200">
                      <div className="font-bold text-red-300">
                        Compromised: {live?.machine_name || machineName}
                      </div>
                      <div className="text-[9px] text-red-400">
                        Node: {live?.machine_id || machineId} | Vector: {live?.attack_type || attackLabel}
                      </div>
                    </div>
                  )}

                  {p.is_calibrated ? (
                    <>
                      <div className="grid grid-cols-2 gap-4 py-2 border-t border-b border-[#00FF66]/10 my-1.5">
                        <div className="flex items-center gap-2">
                          <Heart className="w-4 h-4 text-red-500 fill-current animate-pulse" />
                          <div>
                            <div className="text-[10px] text-gray-400">HR</div>
                            <div
                              className={`font-bold text-sm ${
                                isPatientUnderAttack || isCriticalVitals ? "text-red-500" : "text-white"
                              }`}
                            >
                              {live?.heart_rate || "--"} <span className="text-[9px]">bpm</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Droplet className="w-4 h-4 text-[#3498DB]" />
                          <div>
                            <div className="text-[10px] text-gray-400">SpO₂</div>
                            <div
                              className={`font-bold text-sm ${
                                isPatientUnderAttack || isCriticalVitals ? "text-red-500" : "text-white"
                              }`}
                            >
                              {live?.spo2 || "--"} <span className="text-[9px]">%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <MiniEcgStrip
                        hr={live?.heart_rate || 75}
                        isCritical={isPatientUnderAttack || isCriticalVitals}
                      />
                    </>
                  ) : (
                    <div className="flex-grow flex items-center justify-center text-[10px] text-gray-500 uppercase tracking-wider py-4">
                      Waiting for Device Connection
                    </div>
                  )}

                  <div>
                    <Link
                      href={`/patients/${p.id}`}
                      className={`block text-center py-1.5 text-[10px] font-bold rounded transition-colors uppercase tracking-wider ${
                        isPatientUnderAttack
                          ? "bg-red-600 hover:bg-red-700 text-white border border-red-400 shadow-sm"
                          : "bg-[#1F2937] hover:bg-[#374151] border border-[#00FF66]/30 text-[#00FF66]"
                      }`}
                    >
                      {isPatientUnderAttack ? "🚨 Inspect Emergency Console" : "Inspect Console"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RECENT SECURITY WARNINGS & ALERTS STREAM */}
      {metrics?.recent_alerts && metrics.recent_alerts.length > 0 && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
            <h3 className="text-sm font-bold text-[#002855] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#E74C3C]" />
              Active Medical Intrusion Alerts & Machine Attribution
            </h3>
            <Link href="/alerts" className="text-xs text-[#3498DB] hover:underline font-semibold">
              View All Alerts →
            </Link>
          </div>

          <div className="space-y-2">
            {metrics.recent_alerts.slice(0, 4).map((alt) => (
              <div
                key={alt.id}
                className="bg-[#FDEDEC]/40 border border-[#F5B7B1] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 max-w-3xl">
                  <div className="font-bold text-[#002855]">{alt.message}</div>
                  <div className="text-[#718096] flex flex-wrap items-center gap-3 text-[11px]">
                    <span>
                      Machine: <b className="text-[#0F172A]">{alt.device_name || alt.device_id || "System"}</b> (
                      <code>{alt.device_id}</code>)
                    </span>
                    <span>•</span>
                    <span>
                      Patient: <b className="text-[#0F172A]">{alt.patient_name || alt.patient_id || "N/A"}</b>
                    </span>
                    <span>•</span>
                    <span>
                      Severity: <b className="text-[#E74C3C]">{alt.severity}</b>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-300">
                    UNRESOLVED
                  </span>
                  <Link
                    href="/alerts"
                    className="px-2.5 py-1 bg-white hover:bg-gray-50 border border-gray-300 rounded text-[10px] font-bold text-gray-700 shadow-sm"
                  >
                    Resolve
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

