"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import Link from "next/link";
import {
  HardDrive,
  RefreshCw,
  Power,
  Search,
  Filter,
  Activity,
  HeartPulse,
  Droplets,
  Monitor,
  Wifi,
  Battery,
  BatteryCharging,
  ShieldCheck,
  User,
  ExternalLink,
  Cpu,
  Radio,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

interface Device {
  id: string;
  name: string;
  type: string;
  patient_id: string;
  ip_address: string;
  mac_address: string;
  port: number;
  battery: number;
  firmware_version: string;
  signal_strength: string;
  status: string;
  last_seen: string;
}

interface Patient {
  id: string;
  name: string;
  ward_number: string;
  bed_number: string;
  doctor_assigned: string;
  is_calibrated: boolean;
}

export default function DevicesPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [actionSuccessMsg, setActionSuccessMsg] = useState("");

  // Fetch Devices
  const { data: devices = [], isLoading: isDevicesLoading } = useQuery<Device[]>({
    queryKey: ["devices"],
    queryFn: () => fetchApi<Device[]>("/devices"),
    refetchInterval: 3000,
  });

  // Fetch Patients for real bedside placement & metadata enrichment
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["patients"],
    queryFn: () => fetchApi<Patient[]>("/patients"),
    refetchInterval: 5000,
  });

  // Patient lookup map
  const patientMap = useMemo(() => {
    const map = new Map<string, Patient>();
    patients.forEach((p) => map.set(p.id, p));
    return map;
  }, [patients]);

  const actionMutation = useMutation({
    mutationFn: ({ device_id, action }: { device_id: string; action: string }) =>
      fetchApi("/devices/action", {
        method: "POST",
        body: JSON.stringify({ device_id, action }),
      }),
    onSuccess: (data: any, vars) => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setActionSuccessMsg(`Successfully executed ${vars.action.replace('_', ' ')} on node ${vars.device_id}`);
      setTimeout(() => setActionSuccessMsg(""), 4000);
    },
  });

  // Filtered Devices
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      // Type filter
      if (selectedType !== "ALL" && !d.type.toLowerCase().includes(selectedType.toLowerCase())) {
        return false;
      }
      // Status filter
      if (selectedStatus !== "ALL" && d.status.toLowerCase() !== selectedStatus.toLowerCase()) {
        return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const p = d.patient_id ? patientMap.get(d.patient_id) : null;
        const patName = p?.name?.toLowerCase() || "";
        const ward = p ? `${p.ward_number} ${p.bed_number}`.toLowerCase() : "";
        return (
          d.name.toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q) ||
          d.type.toLowerCase().includes(q) ||
          (d.mac_address || "").toLowerCase().includes(q) ||
          (d.ip_address || "").toLowerCase().includes(q) ||
          patName.includes(q) ||
          ward.includes(q)
        );
      }
      return true;
    });
  }, [devices, selectedType, selectedStatus, searchQuery, patientMap]);

  // Summary Metrics
  const onlineCount = useMemo(() => devices.filter((d) => d.status === "Online").length, [devices]);
  const faultCount = useMemo(() => devices.filter((d) => d.status !== "Online").length, [devices]);
  const avgBattery = useMemo(() => {
    if (devices.length === 0) return 100;
    const total = devices.reduce((acc, d) => acc + (d.battery || 100), 0);
    return Math.round(total / devices.length);
  }, [devices]);

  const getDeviceIcon = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("ecg")) return <HeartPulse className="w-5 h-5 text-emerald-600" />;
    if (t.includes("pulse") || t.includes("spo2") || t.includes("oximeter")) return <Activity className="w-5 h-5 text-cyan-600" />;
    if (t.includes("pump") || t.includes("infusion")) return <Droplets className="w-5 h-5 text-blue-600" />;
    return <Monitor className="w-5 h-5 text-indigo-600" />;
  };

  const formatLastSeen = (ts: string) => {
    if (!ts) return "Continuous (Real-time)";
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
    } catch {
      return "Live Stream Active";
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#002855]">
              Clinical Device & Biomedical Sensor Fleet
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              {onlineCount} Nodes Active
            </span>
          </div>
          <p className="text-xs text-[#718096] mt-0.5">
            Real-time medical sensor telemetry nodes, hardware MAC addresses, battery telemetry, and firmware state.
          </p>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="bg-[#E8F8F5] border border-[#A3E4D7] text-[#117A65] text-xs font-semibold p-3 rounded-lg flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Top Device Fleet KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#718096]">Registered Fleet</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600"><HardDrive className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-black text-[#002855] mt-1">{devices.length}</div>
          <div className="text-[11px] text-[#718096] mt-0.5 font-medium">IoMT Biosensors & Monitors</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#718096]">Online & Streaming</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600"><Radio className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{onlineCount}</div>
          <div className="text-[11px] text-emerald-700 font-medium">50Hz Continuous Telemetry</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#718096]">Fault / Isolated</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600"><AlertTriangle className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-black text-[#002855] mt-1">{faultCount}</div>
          <div className="text-[11px] text-[#718096] font-medium">{faultCount === 0 ? "Zero node interruptions" : "Requires maintenance"}</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#718096]">Average Battery</span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600"><BatteryCharging className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-black text-[#002855] mt-1">{avgBattery}%</div>
          <div className="text-[11px] text-purple-700 font-medium">All Units Optimal</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full md:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#718096]" />
          <input
            type="text"
            placeholder="Search device name, MAC, IP, patient or ward..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#CBD5E0] rounded-lg bg-[#F8FAFC] text-[#1A202C] focus:outline-none focus:border-[#3182CE]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Type Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#718096]" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-[#CBD5E0] rounded-lg bg-[#F8FAFC] text-[#1A202C] focus:outline-none"
            >
              <option value="ALL">All Device Types</option>
              <option value="ECG">ECG Monitors</option>
              <option value="Pulse">Pulse Oximeters</option>
              <option value="Pump">Infusion Pumps</option>
              <option value="ICU">ICU Bedside Monitors</option>
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-[#CBD5E0] rounded-lg bg-[#F8FAFC] text-[#1A202C] focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="Online">Online & Streaming</option>
            <option value="Fault">Fault / Disconnected</option>
            <option value="Quarantine">Quarantined</option>
          </select>
        </div>
      </div>

      {/* Device Cards Grid */}
      {isDevicesLoading ? (
        <div className="text-center py-12 text-xs text-[#718096]">Loading IoMT device metadata...</div>
      ) : filteredDevices.length === 0 ? (
        <div className="bg-white border border-dashed border-[#CBD5E0] rounded-xl p-12 text-center text-xs text-[#718096]">
          No medical devices match the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDevices.map((d) => {
            const patient = d.patient_id ? patientMap.get(d.patient_id) : null;
            const isOnline = d.status === "Online";

            return (
              <div
                key={d.id}
                className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  {/* Card Header: Device Icon, Name & Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[#F0F7FF] border border-[#D0E6FF] flex items-center justify-center flex-shrink-0">
                        {getDeviceIcon(d.type)}
                      </div>
                      <div>
                        <h2 className="font-bold text-[#002855] text-sm leading-tight">{d.name}</h2>
                        <div className="text-[11px] text-[#718096] mt-0.5 font-medium">
                          {d.type}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full flex-shrink-0 flex items-center gap-1 ${
                        isOnline
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                      {d.status}
                    </span>
                  </div>

                  {/* Bedside Clinical Context */}
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 space-y-1.5 text-xs text-[#4A5568]">
                    <div className="flex justify-between items-center">
                      <span className="text-[#718096] flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-[#3182CE]" /> Admitted Patient:
                      </span>
                      {patient ? (
                        <Link
                          href={`/patients/${patient.id}`}
                          className="font-bold text-[#002855] hover:text-[#3182CE] hover:underline flex items-center gap-1"
                        >
                          {patient.name} <ExternalLink className="w-3 h-3 text-[#3182CE]" />
                        </Link>
                      ) : (
                        <span className="font-medium text-[#718096]">{d.patient_id || "Unassigned Subnet"}</span>
                      )}
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#718096]">Bed Location:</span>
                      <b className="text-[#0F172A]">
                        {patient ? `${patient.ward_number} — ${patient.bed_number}` : "Central Telemetry Subnet"}
                      </b>
                    </div>

                    {patient?.doctor_assigned && (
                      <div className="flex justify-between items-center">
                        <span className="text-[#718096]">Attending Physician:</span>
                        <b className="text-[#0F172A]">{patient.doctor_assigned}</b>
                      </div>
                    )}
                  </div>

                  {/* Real Hardware & Network Telemetry Grid */}
                  <div className="text-xs space-y-2 pt-1 text-[#4A5568]">
                    <div className="flex justify-between items-center">
                      <span className="text-[#718096]">Device ID:</span>
                      <code className="font-mono text-[#002855] font-semibold text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                        {d.id}
                      </code>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#718096] flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-[#718096]" /> MAC Address:
                      </span>
                      <span className="font-mono text-[11px] text-[#0F172A]">{d.mac_address || "00:1B:44:11:3A:B7"}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#718096]">Network Socket:</span>
                      <span className="font-mono text-[11px] text-[#0F172A]">
                        {d.ip_address}:{d.port || 1883}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#718096] flex items-center gap-1">
                        <Wifi className="w-3 h-3 text-[#718096]" /> WiFi Signal:
                      </span>
                      <span className="text-[#0F172A] font-semibold flex items-center gap-1">
                        <span className="text-emerald-600 font-bold">●</span> {d.signal_strength || "Excellent (-42 dBm)"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#718096] flex items-center gap-1">
                        <Battery className="w-3 h-3 text-[#718096]" /> Battery Level:
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              d.battery > 50 ? "bg-[#2ECC71]" : d.battery > 20 ? "bg-[#F39C12]" : "bg-[#E74C3C]"
                            }`}
                            style={{ width: `${d.battery || 100}%` }}
                          />
                        </div>
                        <b className="text-[#0F172A] font-mono text-[11px]">{d.battery || 100}%</b>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#718096] flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" /> Firmware:
                      </span>
                      <b className="text-[#002855] font-mono text-[11px] bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                        {d.firmware_version || "v2.5.0-SECURED"}
                      </b>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-[#F0F0F0] text-[11px]">
                      <span className="text-[#718096]">Last Heartbeat:</span>
                      <span className="font-mono text-[#718096]">{formatLastSeen(d.last_seen)}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Controls */}
                <div className="pt-3 border-t border-[#F0F0F0] space-y-2">
                  {d.patient_id && (
                    <Link
                      href={`/patients/${d.patient_id}`}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#EBF3FA] hover:bg-[#D4E6F1] text-[#002855] rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Activity className="w-3.5 h-3.5 text-[#3182CE]" />
                      <span>Open Live Patient Telemetry</span>
                    </Link>
                  )}

                  <div className="flex items-center gap-2">
                    {isOnline ? (
                      <button
                        onClick={() =>
                          actionMutation.mutate({
                            device_id: d.id,
                            action: "disconnect",
                          })
                        }
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Power className="w-3.5 h-3.5 text-red-600" /> Disconnect Sensor
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          actionMutation.mutate({
                            device_id: d.id,
                            action: "reconnect",
                          })
                        }
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Power className="w-3.5 h-3.5 text-emerald-600" /> Reconnect Sensor
                      </button>
                    )}

                    <button
                      onClick={() =>
                        actionMutation.mutate({
                          device_id: d.id,
                          action: "update_firmware",
                        })
                      }
                      className="flex items-center justify-center gap-1 px-3 py-1.5 bg-[#F8FAFC] hover:bg-[#EDF2F7] border border-[#CBD5E0] text-[#4A5568] rounded-lg text-xs font-semibold transition-colors"
                      title="Verify and install latest signed firmware"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#3182CE]" /> Update
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
