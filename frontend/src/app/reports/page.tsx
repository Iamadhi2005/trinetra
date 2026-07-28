"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { Download, FileText, BarChart } from "lucide-react";

interface ReportSummary {
  total_events: number;
  quarantined_events: number;
  blocked_events: number;
  mitm_discarded: number;
  dos_floods: number;
}

export default function ReportsPage() {
  const { data: summary } = useQuery<ReportSummary>({
    queryKey: ["report-summary"],
    queryFn: () => fetchApi<ReportSummary>("/reports/summary"),
  });

  const handleDownloadCsv = () => {
    const token = localStorage.getItem("trinetra_token");
    fetch("http://localhost:8000/api/reports/download/csv", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "trinetra_security_report.csv";
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#002855]">
          Executive Incident Reports & Compliance Export
        </h1>
        <p className="text-xs text-[#718096]">
          Audit-ready Clinical IoMT Security Metrics & Database Log Exporters
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="text-[11px] font-bold text-[#718096] uppercase">
            Total Threat Detections
          </div>
          <div className="text-2xl font-bold text-[#002855] mt-1">
            {summary?.total_events || 0}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="text-[11px] font-bold text-[#718096] uppercase">
            Quarantined Attacks
          </div>
          <div className="text-2xl font-bold text-[#E67E22] mt-1">
            {summary?.quarantined_events || 0}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="text-[11px] font-bold text-[#718096] uppercase">
            MitM Signatures Discarded
          </div>
          <div className="text-2xl font-bold text-[#C0392B] mt-1">
            {summary?.mitm_discarded || 0}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="text-[11px] font-bold text-[#718096] uppercase">
            DoS Floods Intercepted
          </div>
          <div className="text-2xl font-bold text-[#9B59B6] mt-1">
            {summary?.dos_floods || 0}
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 shadow-sm flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="font-bold text-[#002855] text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#3498DB]" /> Full Security Audit CSV Report
          </h3>
          <p className="text-xs text-[#718096]">
            Export complete normalized security log table including timestamps, client IPs, and mitigation actions.
          </p>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#002855] hover:bg-[#001D40] text-white text-xs font-semibold rounded shadow-sm transition-colors"
        >
          <Download className="w-4 h-4" /> Download CSV Report
        </button>
      </div>
    </div>
  );
}
