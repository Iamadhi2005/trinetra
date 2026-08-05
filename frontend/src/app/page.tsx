"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import {
  Activity,
  Users,
  AlertTriangle,
  ShieldCheck,
  Heart,
  Droplet,
  Zap,
  Wifi,
  Cpu,
  Monitor,
  HeartPulse,
} from "lucide-react";
import Link from "next/link";

interface DashboardData {
  active_devices: number;
  patients_count: number;
  active_alerts_count: number;
  attacks_today: number;
  threat_level: string;
  network_health: string;
  uptime: string;
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
}

export default function DashboardPage() {
  const [liveVitals, setLiveVitals] = useState<Record<string, LiveVitalSummary>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch Dashboard Metrics
  const { data: metrics, isLoading: isMetricsLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard-metrics"],
    queryFn: () => fetchApi<DashboardData>("/dashboard"),
    refetchInterval: 3000,
    enabled: mounted,
  });

  // Fetch Patients List
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["patients"],
    queryFn: () => fetchApi<Patient[]>("/patients"),
    enabled: mounted,
  });

  // Maintain list of active WebSockets for all calibrated patients to render the central ICU telemetry panel!
  useEffect(() => {
    if (!mounted || patients.length === 0) return;

    const sockets: Record<string, WebSocket> = {};

    patients.forEach((p) => {
      if (!p.is_calibrated) return;

      const ws = new WebSocket(`ws://localhost:8000/ws/telemetry/${p.id}`);
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setLiveVitals((prev) => ({
          ...prev,
          [p.id]: {
            patient_id: p.id,
            name: p.name,
            heart_rate: data.heart_rate,
            spo2: data.spo2,
            status: data.status,
            is_calibrated: true,
          },
        }));
      };
      sockets[p.id] = ws;
    });

    return () => {
      Object.values(sockets).forEach((ws) => ws.close());
    };
  }, [patients, mounted]);

  if (!mounted) {
    return <div className="text-xs text-[#718096]">Loading central telemetry station...</div>;
  }

  const activeMonitoringCount = Object.values(liveVitals).filter(v => v.is_calibrated).length;
  const criticalPatientsCount = Object.values(liveVitals).filter(v => v.heart_rate > 100 || v.heart_rate < 55 || v.spo2 < 93).length;

  return (
    <div className="space-y-6">
      {/* Central Monitor Header Banner */}
      <div className="bg-[#002855] text-white p-4 rounded-lg flex items-center justify-between shadow-sm border border-[#1A3F6B]">
        <div>
          <h1 className="text-base font-bold uppercase tracking-wider flex items-center gap-2">
            <Monitor className="w-5 h-5 text-[#3498DB] animate-pulse" /> ICU Central Monitoring Station
          </h1>
          <p className="text-[11px] text-[#A0AEC0] uppercase tracking-widest mt-0.5">
            Real-time Clinical Telemetry Gate & Network Integrity Guard
          </p>
        </div>
        <div className="text-xs font-semibold bg-[#001D40] px-3 py-1 rounded border border-[#1A3F6B] text-[#2ECC71]">
          ● SYSTEM RUNNING SMOOTHLY
        </div>
      </div>

      {/* Clinical KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Admitted */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="text-[10px] font-bold text-[#718096] uppercase tracking-wider">
            Total Patients
          </div>
          <div className="text-xl font-bold text-[#0F172A] mt-1">
            {isMetricsLoading ? "--" : metrics?.patients_count}
          </div>
          <div className="text-[10px] text-[#718096] mt-1">Admitted Registry</div>
        </div>

        {/* Connected Nodes */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="text-[10px] font-bold text-[#718096] uppercase tracking-wider">
            Connected Devices
          </div>
          <div className="text-xl font-bold text-[#0F172A] mt-1">
            {isMetricsLoading ? "--" : metrics?.active_devices}
          </div>
          <div className="text-[10px] text-[#2ECC71] font-semibold mt-1">Online Telemetry</div>
        </div>

        {/* Active Telemetry Sessions */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="text-[10px] font-bold text-[#718096] uppercase tracking-wider">
            Active Sessions
          </div>
          <div className="text-xl font-bold text-[#3498DB] mt-1">
            {activeMonitoringCount} / {metrics?.patients_count || 0}
          </div>
          <div className="text-[10px] text-[#3498DB] font-semibold mt-1">WebSocket Feeds</div>
        </div>

        {/* Critical Alerts */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="text-[10px] font-bold text-[#718096] uppercase tracking-wider">
            Critical Vitals
          </div>
          <div className={`text-xl font-bold mt-1 ${criticalPatientsCount > 0 ? "text-[#E74C3C]" : "text-[#2ECC71]"}`}>
            {criticalPatientsCount}
          </div>
          <div className="text-[10px] text-[#718096] mt-1">Vitals Out of Range</div>
        </div>

        {/* Network Alerts */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="text-[10px] font-bold text-[#718096] uppercase tracking-wider">
            Device Alerts
          </div>
          <div className={`text-xl font-bold mt-1 ${ (metrics?.active_alerts_count || 0) > 0 ? "text-[#E74C3C]" : "text-[#2ECC71]"}`}>
            {metrics?.active_alerts_count}
          </div>
          <div className="text-[10px] text-[#718096] mt-1">Sensor Warnings</div>
        </div>

        {/* Cybersecurity status */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="text-[10px] font-bold text-[#718096] uppercase tracking-wider">
            Cyber Threat Logs
          </div>
          <div className="text-xl font-bold text-[#0F172A] mt-1">
            {isMetricsLoading ? "--" : metrics?.attacks_today}
          </div>
          <div className="text-[10px] text-[#2ECC71] font-semibold mt-1">IPS Isolated</div>
        </div>
      </div>

      {/* ICU Central Telemetry Grid Display */}
      <div className="bg-[#0A0F1D] rounded-lg p-5 border border-[#00FF66]/20 shadow-md">
        <h2 className="text-[#00FF66] font-mono text-sm uppercase tracking-widest border-b border-[#00FF66]/20 pb-3 mb-4 flex items-center gap-2">
          <HeartPulse className="w-5 h-5 animate-pulse" /> Live Telemetry Feed Matrix
        </h2>

        {patients.length === 0 ? (
          <div className="text-xs font-mono text-gray-500 py-12 text-center">
            No patients registered. Admitted ward subnet is empty.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patients.map((p) => {
              const live = liveVitals[p.id];
              const isCritical = live && (live.heart_rate > 100 || live.heart_rate < 55 || live.spo2 < 93);

              return (
                <div
                  key={p.id}
                  className={`bg-[#111827] border rounded-lg p-4 font-mono text-xs flex flex-col justify-between h-[150px] transition-all ${
                    isCritical
                      ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)] bg-red-950/10"
                      : "border-[#00FF66]/20"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-white font-bold text-sm tracking-wide">
                        {p.name}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        ID: <code>{p.id}</code> | Ward: {p.ward_number}-{p.bed_number}
                      </div>
                    </div>
                    {p.is_calibrated ? (
                      <span className="text-[#00FF66] font-bold animate-pulse text-[10px]">
                        ● STREAMING
                      </span>
                    ) : (
                      <span className="text-gray-500 font-bold text-[10px]">
                        UNCALIBRATED
                      </span>
                    )}
                  </div>

                  {p.is_calibrated ? (
                    <div className="grid grid-cols-2 gap-4 py-2 border-t border-b border-[#00FF66]/10 my-2">
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-red-500 fill-current animate-pulse" />
                        <div>
                          <div className="text-[10px] text-gray-400">HR</div>
                          <div className={`font-bold text-sm ${isCritical ? "text-red-500" : "text-white"}`}>
                            {live?.heart_rate || "--"} <span className="text-[9px]">bpm</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Droplet className="w-4 h-4 text-[#3498DB]" />
                        <div>
                          <div className="text-[10px] text-gray-400">SpO₂</div>
                          <div className={`font-bold text-sm ${isCritical ? "text-red-500" : "text-white"}`}>
                            {live?.spo2 || "--"} <span className="text-[9px]">%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-grow flex items-center justify-center text-[10px] text-gray-500 uppercase tracking-wider py-4">
                      Waiting for Device Connection
                    </div>
                  )}

                  <div>
                    <Link
                      href={`/patients/${p.id}`}
                      className="block text-center py-1 bg-[#1F2937] hover:bg-[#374151] border border-[#00FF66]/30 text-[#00FF66] text-[10px] font-bold rounded transition-colors uppercase tracking-wider"
                    >
                      Inspect Console
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
