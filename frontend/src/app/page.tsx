"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import {
  Activity,
  Users,
  AlertTriangle,
  ShieldCheck,
  Clock,
  Heart,
  Droplet,
  Zap,
  Wifi,
  Cpu,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
}

interface VitalPoint {
  time: string;
  heart_rate: number;
  spo2: number;
}

export default function DashboardPage() {
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [vitalStream, setVitalStream] = useState<VitalPoint[]>([]);
  const [currentVitals, setCurrentVitals] = useState({
    heart_rate: 75,
    spo2: 98,
    infusion_rate: 5.0,
  });

  // Fetch Dashboard Metrics
  const { data: metrics, isLoading: isMetricsLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard-metrics"],
    queryFn: () => fetchApi<DashboardData>("/dashboard"),
    refetchInterval: 3000,
  });

  // Fetch Patients List
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["patients"],
    queryFn: () => fetchApi<Patient[]>("/patients"),
  });

  useEffect(() => {
    if (patients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(patients[0].id);
    }
  }, [patients, selectedPatientId]);

  // Live Vitals Streaming for Selected Patient
  useEffect(() => {
    if (!selectedPatientId) return;

    const fetchVitals = async () => {
      try {
        const data = await fetchApi<any>(`/patients/${selectedPatientId}/vitals`);
        setCurrentVitals({
          heart_rate: data.heart_rate,
          spo2: data.spo2,
          infusion_rate: data.infusion_rate,
        });

        const timeLabel = new Date().toLocaleTimeString("en-US", {
          hour12: false,
          minute: "2-digit",
          second: "2-digit",
        });

        setVitalStream((prev) => {
          const next = [
            ...prev,
            {
              time: timeLabel,
              heart_rate: Number(data.heart_rate.toFixed(1)),
              spo2: Number(data.spo2.toFixed(1)),
            },
          ];
          return next.slice(-20); // Keep last 20 points
        });
      } catch (err) {}
    };

    fetchVitals();
    const interval = setInterval(fetchVitals, 1000);
    return () => clearInterval(interval);
  }, [selectedPatientId]);

  return (
    <div className="space-y-6">
      {/* Top 5 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Active Devices */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#718096] uppercase tracking-wider">
              Active Devices
            </span>
            <Activity className="w-4 h-4 text-[#002855]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A] mt-2">
            {isMetricsLoading ? "--" : metrics?.active_devices}
          </div>
          <div className="text-xs text-[#2ECC71] font-semibold mt-1">
            All Connected
          </div>
        </div>

        {/* Card 2: Patients Monitored */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#718096] uppercase tracking-wider">
              Patients Monitored
            </span>
            <Users className="w-4 h-4 text-[#3498DB]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A] mt-2">
            {isMetricsLoading ? "--" : metrics?.patients_count}
          </div>
          <div className="text-xs text-[#3498DB] font-semibold mt-1">
            In Care
          </div>
        </div>

        {/* Card 3: Active Alerts */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#718096] uppercase tracking-wider">
              Active Alerts
            </span>
            <AlertTriangle
              className={`w-4 h-4 ${
                (metrics?.active_alerts_count || 0) > 0
                  ? "text-[#EC7063]"
                  : "text-[#718096]"
              }`}
            />
          </div>
          <div
            className={`text-2xl font-bold mt-2 ${
              (metrics?.active_alerts_count || 0) > 0
                ? "text-[#EC7063]"
                : "text-[#0F172A]"
            }`}
          >
            {isMetricsLoading ? "--" : metrics?.active_alerts_count}
          </div>
          <div
            className={`text-xs font-semibold mt-1 ${
              (metrics?.active_alerts_count || 0) > 0
                ? "text-[#EC7063]"
                : "text-[#718096]"
            }`}
          >
            {(metrics?.active_alerts_count || 0) > 0
              ? "Action Required"
              : "No Alerts"}
          </div>
        </div>

        {/* Card 4: Attacks Today */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#718096] uppercase tracking-wider">
              Attacks Intercepted
            </span>
            <ShieldCheck className="w-4 h-4 text-[#2ECC71]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A] mt-2">
            {isMetricsLoading ? "--" : metrics?.attacks_today}
          </div>
          <div className="text-xs text-[#2ECC71] font-semibold mt-1">
            Hard Blocked
          </div>
        </div>

        {/* Card 5: System Uptime */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#718096] uppercase tracking-wider">
              System Uptime
            </span>
            <Clock className="w-4 h-4 text-[#2ECC71]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A] mt-2">
            {metrics?.uptime || "18h 42m"}
          </div>
          <div className="text-xs text-[#2ECC71] font-semibold mt-1">
            Continuous
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Patient Vitals Stream (Recharts) */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-[#002855] text-sm uppercase tracking-wide">
              Patient Vitals (Live)
            </h2>
            {patients.length > 0 ? (
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="text-xs bg-[#F8FAFC] border border-[#CBD5E0] rounded px-2 py-1 text-[#1A202C] font-medium"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id})
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          {patients.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-xs text-[#A0AEC0] border border-dashed border-[#CBD5E0] rounded-md">
              No patients registered in backend database.
            </div>
          ) : (
            <>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={vitalStream}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis domain={[50, 130]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="heart_rate"
                      stroke="#2ECC71"
                      strokeWidth={2}
                      dot={false}
                      name="Heart Rate (bpm)"
                    />
                    <Line
                      type="monotone"
                      dataKey="spo2"
                      stroke="#3498DB"
                      strokeWidth={2}
                      dot={false}
                      name="SpO2 (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Vitals Summary Card */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded p-3 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#4A5568] font-semibold">
                    <Heart className="w-3.5 h-3.5 text-[#2ECC71]" /> HEART RATE:
                  </span>
                  <span className="font-bold text-[#0F172A]">
                    {currentVitals.heart_rate.toFixed(1)} bpm
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#4A5568] font-semibold">
                    <Droplet className="w-3.5 h-3.5 text-[#3498DB]" /> SpO2:
                  </span>
                  <span className="font-bold text-[#0F172A]">
                    {currentVitals.spo2.toFixed(1)} %
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#4A5568] font-semibold">
                    <Zap className="w-3.5 h-3.5 text-[#9B59B6]" /> INFUSION PUMP:
                  </span>
                  <span className="font-bold text-[#0F172A]">
                    {currentVitals.infusion_rate.toFixed(1)} mL/h
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Column 2: Security Status & Gauge */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm space-y-4">
          <h2 className="font-bold text-[#002855] text-sm uppercase tracking-wide">
            Security Status
          </h2>

          <div className="text-center py-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
            <div className="text-4xl mb-1">
              {(metrics?.active_alerts_count || 0) > 0 ? "🛡️" : "💚"}
            </div>
            <div className="text-xs font-semibold text-[#718096] uppercase tracking-wider">
              Threat Level
            </div>
            <div
              className={`text-2xl font-bold ${
                (metrics?.active_alerts_count || 0) > 0
                  ? "text-[#EC7063]"
                  : "text-[#2ECC71]"
              }`}
            >
              {metrics?.threat_level || "LOW"}
            </div>
            <p className="text-[11px] text-[#718096] mt-0.5">
              {(metrics?.active_alerts_count || 0) > 0
                ? "Active Quarantine Isolation"
                : "System is Secure"}
            </p>
          </div>

          <div className="text-xs space-y-2 pt-2">
            <div className="flex justify-between border-b border-[#F0F0F0] pb-1.5">
              <span className="text-[#4A5568]">IDS Monitor:</span>
              <span className="font-semibold text-[#2ECC71]">Active</span>
            </div>
            <div className="flex justify-between border-b border-[#F0F0F0] pb-1.5">
              <span className="text-[#4A5568]">IPS Active Prevention:</span>
              <span className="font-semibold text-[#2ECC71]">Ready</span>
            </div>
            <div className="flex justify-between border-b border-[#F0F0F0] pb-1.5">
              <span className="text-[#4A5568]">HMAC Cryptographic Verification:</span>
              <span className="font-semibold text-[#2ECC71]">All Valid</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#4A5568]">Time Synchronization:</span>
              <span className="font-semibold text-[#2ECC71]">Synced</span>
            </div>
          </div>
        </div>

        {/* Column 3: Network Status */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm space-y-4">
          <h2 className="font-bold text-[#002855] text-sm uppercase tracking-wide">
            Network Status
          </h2>

          <div className="text-xs space-y-3">
            <div className="flex justify-between items-center bg-[#F8FAFC] p-2.5 rounded border border-[#E2E8F0]">
              <span className="flex items-center gap-1.5 text-[#4A5568] font-semibold">
                <Wifi className="w-3.5 h-3.5 text-[#2ECC71]" /> MQTT Broker:
              </span>
              <span className="font-bold text-[#2ECC71]">Connected</span>
            </div>
            <div className="flex justify-between items-center bg-[#F8FAFC] p-2.5 rounded border border-[#E2E8F0]">
              <span className="text-[#4A5568] font-semibold">Connected Devices:</span>
              <span className="font-bold text-[#002855]">
                {metrics?.active_devices || 0} Nodes
              </span>
            </div>
            <div className="flex justify-between items-center bg-[#F8FAFC] p-2.5 rounded border border-[#E2E8F0]">
              <span className="text-[#4A5568] font-semibold">Packet Rate:</span>
              <span className="font-bold text-[#0F172A]">25 packets/sec</span>
            </div>
            <div className="flex justify-between items-center bg-[#F8FAFC] p-2.5 rounded border border-[#E2E8F0]">
              <span className="text-[#4A5568] font-semibold">Network Health:</span>
              <span className="font-bold text-[#2ECC71]">
                {metrics?.network_health || "Excellent"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
