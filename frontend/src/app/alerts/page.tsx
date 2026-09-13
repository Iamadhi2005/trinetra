"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  User,
  Clock,
  Search,
  Check,
  Filter,
  ChevronDown,
  ChevronUp,
  Activity,
  HeartPulse,
  Info
} from "lucide-react";

interface Alert {
  id: number;
  timestamp: string;
  device_id: string;
  device_name?: string;
  device_type?: string;
  patient_id: string;
  patient_name?: string;
  severity: string;
  message: string;
  status: string;
  resolution_notes: string;
}

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"unresolved" | "resolved" | "all">("unresolved");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [expandedTechId, setExpandedTechId] = useState<number | null>(null);

  const { data: alerts = [], isLoading } = useQuery<Alert[]>({
    queryKey: ["alerts"],
    queryFn: () => fetchApi<Alert[]>("/alerts"),
    refetchInterval: 3000,
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) =>
      fetchApi(`/alerts/${id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ notes }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      setSelectedAlertId(null);
      setNotes("");
    },
  });

  // Filtered Alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      // Tab filter
      if (activeTab === "unresolved" && a.status === "Resolved") return false;
      if (activeTab === "resolved" && a.status !== "Resolved") return false;

      // Severity filter
      if (selectedSeverity !== "ALL" && a.severity?.toUpperCase() !== selectedSeverity) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const msg = (a.message || "").toLowerCase();
        const pName = (a.patient_name || a.patient_id || "").toLowerCase();
        const dName = (a.device_name || a.device_id || "").toLowerCase();
        const dType = (a.device_type || "").toLowerCase();
        return msg.includes(q) || pName.includes(q) || dName.includes(q) || dType.includes(q);
      }

      return true;
    });
  }, [alerts, activeTab, selectedSeverity, searchQuery]);

  const unresolvedCount = useMemo(() => alerts.filter((a) => a.status !== "Resolved").length, [alerts]);
  const resolvedCount = useMemo(() => alerts.filter((a) => a.status === "Resolved").length, [alerts]);

  const formatHospitalTime = (ts: string) => {
    if (!ts) return "Just now";
    try {
      const d = new Date(ts);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return ts;
    }
  };

  // Convert technical raw alerts into clean, nurse & doctor-friendly descriptions
  const getFriendlyDescription = (rawMsg: string) => {
    if (!rawMsg) return "Medical telemetry signal variation detected.";
    if (rawMsg.includes("DoS") || rawMsg.includes("flood")) {
      return "High network traffic detected — device telemetry traffic momentarily isolated for signal stability.";
    }
    if (rawMsg.includes("MitM") || rawMsg.includes("tamper") || rawMsg.includes("signature")) {
      return "Unverified signal source detected — telemetry channel isolated to ensure data authenticity.";
    }
    if (rawMsg.includes("outlier") || rawMsg.includes("vital") || rawMsg.includes("Isolation Forest")) {
      return "Physiological vital outlier flagged — verify patient sensor placement and clinical telemetry.";
    }
    if (rawMsg.includes("Replay")) {
      return "Delayed telemetry packet sequence detected — stream synchronized for real-time accuracy.";
    }
    return rawMsg;
  };

  const getSeverityBadge = (severity: string) => {
    const s = (severity || "").toLowerCase();
    if (s.includes("crit") || s.includes("high")) {
      return {
        bg: "bg-red-50 text-red-700 border-red-200",
        icon: <AlertOctagon className="w-3.5 h-3.5 text-red-600" />,
        label: "CRITICAL PRIORITY",
        border: "border-l-4 border-l-red-500",
      };
    }
    if (s.includes("warn") || s.includes("med")) {
      return {
        bg: "bg-amber-50 text-amber-800 border-amber-200",
        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
        label: "ATTENTION NEEDED",
        border: "border-l-4 border-l-amber-500",
      };
    }
    return {
      bg: "bg-blue-50 text-blue-700 border-blue-200",
      icon: <Info className="w-3.5 h-3.5 text-blue-600" />,
      label: "ROUTINE NOTICE",
      border: "border-l-4 border-l-blue-400",
    };
  };

  const quickNotes = [
    "Patient checked, vitals stable",
    "Sensor repositioned & recalibrated",
    "False alarm verified by duty nurse",
    "Equipment restarted & operating normally"
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Hospital Alert Center Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#002855]">
              Hospital Alert & Patient Safety Center
            </h1>
            {unresolvedCount > 0 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                {unresolvedCount} Action Required
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5" /> All Clear
              </span>
            )}
          </div>
          <p className="text-xs text-[#718096] mt-0.5">
            Real-time patient telemetry warnings, sensor disconnection notices, and staff resolution history.
          </p>
        </div>
      </div>

      {/* Hospital Summary KPI Counter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#718096]">
              Action Required
            </div>
            <div className="text-2xl font-black text-[#002855] mt-1">
              {unresolvedCount}
            </div>
            <div className="text-[11px] text-red-600 font-semibold mt-0.5">
              {unresolvedCount === 0 ? "No active warnings" : "Awaiting staff acknowledgement"}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
            <Bell className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#718096]">
              Resolved History
            </div>
            <div className="text-2xl font-black text-[#002855] mt-1">
              {resolvedCount}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              Acknowledged by clinical staff
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#718096]">
              Total Tracked
            </div>
            <div className="text-2xl font-black text-[#002855] mt-1">
              {alerts.length}
            </div>
            <div className="text-[11px] text-[#718096] mt-0.5">
              Telemetry events logged
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <HeartPulse className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Tab Navigation Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          <button
            onClick={() => setActiveTab("unresolved")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "unresolved"
                ? "bg-[#002855] text-white shadow-sm"
                : "bg-gray-100 text-[#4A5568] hover:bg-gray-200"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Action Required</span>
            {unresolvedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {unresolvedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("resolved")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "resolved"
                ? "bg-[#002855] text-white shadow-sm"
                : "bg-gray-100 text-[#4A5568] hover:bg-gray-200"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Resolved</span>
          </button>

          <button
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "all"
                ? "bg-[#002855] text-white shadow-sm"
                : "bg-gray-100 text-[#4A5568] hover:bg-gray-200"
            }`}
          >
            All Alerts ({alerts.length})
          </button>
        </div>

        {/* Search & Severity Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#718096]" />
            <input
              type="text"
              placeholder="Search patient, device, message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#CBD5E0] rounded-lg bg-[#F8FAFC] text-[#1A202C] focus:outline-none focus:border-[#3182CE]"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#718096]" />
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-[#CBD5E0] rounded-lg bg-[#F8FAFC] text-[#1A202C] focus:outline-none"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High Attention</option>
              <option value="WARNING">Warning</option>
              <option value="INFO">Routine</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      {isLoading ? (
        <div className="text-center py-12 text-xs text-[#718096]">
          Loading clinical alerts...
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-white border border-dashed border-[#CBD5E0] rounded-xl p-12 text-center space-y-2">
          <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-bold text-[#002855]">
            {activeTab === "unresolved"
              ? "No Active Hospital Alerts"
              : "No Alerts Matching Your Filter"}
          </h3>
          <p className="text-xs text-[#718096] max-w-md mx-auto">
            {activeTab === "unresolved"
              ? "All medical devices and patient telemetry streams are operating normally with zero active warnings."
              : "Try adjusting your search query or severity filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => {
            const badge = getSeverityBadge(alert.severity);
            const isUnresolved = alert.status !== "Resolved";
            const isFormOpen = selectedAlertId === alert.id;
            const isTechOpen = expandedTechId === alert.id;

            return (
              <div
                key={alert.id}
                className={`bg-white border rounded-xl p-5 shadow-sm transition-all ${
                  isUnresolved
                    ? `${badge.border} bg-white shadow-sm hover:shadow-md`
                    : "border-[#E2E8F0] opacity-90"
                }`}
              >
                {/* Alert Top Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-2">
                    {/* Badges line */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                        {badge.icon}
                        {badge.label}
                      </span>

                      {isUnresolved ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Unresolved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Resolved
                        </span>
                      )}

                      <span className="text-[11px] text-[#718096] flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {formatHospitalTime(alert.timestamp)}
                      </span>
                    </div>

                    {/* Clear Clinical Alert Title */}
                    <h2 className="text-sm font-bold text-[#002855]">
                      {getFriendlyDescription(alert.message)}
                    </h2>

                    {/* Clean Patient & Device Info Chips */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#4A5568] pt-1">
                      <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 rounded-md">
                        <User className="w-3.5 h-3.5 text-[#3182CE]" />
                        <span className="text-[#718096]">Patient:</span>
                        <b className="text-[#0F172A]">{alert.patient_name || alert.patient_id || "General Ward"}</b>
                      </div>

                      <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 rounded-md">
                        <Activity className="w-3.5 h-3.5 text-[#805AD5]" />
                        <span className="text-[#718096]">Equipment:</span>
                        <b className="text-[#0F172A]">{alert.device_name || alert.device_type || alert.device_id || "Medical Monitor"}</b>
                      </div>
                    </div>
                  </div>

                  {/* Right Action Button */}
                  <div className="flex-shrink-0 pt-1 sm:pt-0">
                    {isUnresolved ? (
                      <button
                        onClick={() => setSelectedAlertId(isFormOpen ? null : alert.id)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#2ECC71] hover:bg-[#27AE60] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Acknowledge & Resolve</span>
                      </button>
                    ) : (
                      <div className="text-right">
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-md inline-block">
                          ✓ Case Closed
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Resolution Notes Box for Resolved Alerts */}
                {!isUnresolved && alert.resolution_notes && (
                  <div className="mt-3 p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg text-xs text-emerald-900 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-emerald-950">Staff Resolution Note: </span>
                      <span>{alert.resolution_notes}</span>
                    </div>
                  </div>
                )}

                {/* Expandable Resolution Form */}
                {isFormOpen && (
                  <div className="mt-4 pt-4 border-t border-[#E2E8F0] space-y-3 bg-[#F8FAFC] p-4 rounded-lg border">
                    <label className="block text-xs font-bold text-[#002855]">
                      Staff Action & Resolution Note
                    </label>

                    {/* Quick Note Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {quickNotes.map((qn) => (
                        <button
                          key={qn}
                          type="button"
                          onClick={() => setNotes(qn)}
                          className="text-[11px] px-2.5 py-1 bg-white border border-[#CBD5E0] hover:border-[#3182CE] text-[#4A5568] hover:text-[#3182CE] rounded-md transition-colors"
                        >
                          + {qn}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Patient checked by duty nurse, vitals confirmed normal and sensor re-attached."
                      className="w-full text-xs p-2.5 border border-[#CBD5E0] rounded-md bg-white text-[#1A202C] focus:outline-none focus:border-[#3182CE]"
                    />

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAlertId(null);
                          setNotes("");
                        }}
                        className="px-3 py-1.5 text-xs text-[#718096] hover:bg-gray-200 rounded-md font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => resolveMutation.mutate({ id: alert.id, notes })}
                        className="px-4 py-1.5 bg-[#2ECC71] hover:bg-[#27AE60] text-white text-xs font-bold rounded-md shadow-sm transition-colors"
                      >
                        Save & Resolve Alert
                      </button>
                    </div>
                  </div>
                )}

                {/* Optional Collapsible Technical Diagnostic info for Biomedical/IT */}
                <div className="mt-3 pt-2 border-t border-[#F0F0F0] flex items-center justify-between">
                  <button
                    onClick={() => setExpandedTechId(isTechOpen ? null : alert.id)}
                    className="text-[11px] text-[#718096] hover:text-[#002855] font-medium flex items-center gap-1 transition-colors"
                  >
                    <span>Technical Diagnostics</span>
                    {isTechOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  <span className="text-[10px] text-[#A0AEC0] font-mono">
                    Incident ID: #{alert.id}
                  </span>
                </div>

                {isTechOpen && (
                  <div className="mt-2 p-3 bg-[#0F172A] text-slate-200 rounded-lg text-xs font-mono space-y-1">
                    <div className="text-[11px] text-slate-400">Raw Telemetry Signature:</div>
                    <div className="text-emerald-400 break-all">{alert.message}</div>
                    <div className="text-[11px] text-slate-400 pt-1">
                      Device MAC/ID: <span className="text-white">{alert.device_id || "System"}</span> | Patient ID: <span className="text-white">{alert.patient_id || "N/A"}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
