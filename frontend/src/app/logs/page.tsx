"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";

interface AuditLog {
  id: number;
  timestamp: string;
  username: string;
  action: string;
  target: string;
  severity: string;
  result: string;
}

interface LogsResponse {
  total: number;
  page: number;
  limit: number;
  logs: AuditLog[];
}

export default function LogsPage() {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<LogsResponse>({
    queryKey: ["audit-logs", search, severity, page],
    queryFn: () =>
      fetchApi<LogsResponse>(
        `/logs?page=${page}&limit=15${
          search ? `&search=${encodeURIComponent(search)}` : ""
        }${severity ? `&severity=${encodeURIComponent(severity)}` : ""}`
      ),
    refetchInterval: 5000,
  });

  const totalPages = Math.ceil((data?.total || 0) / 15);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#002855]">
          System Audit & Security Action Logs
        </h1>
        <p className="text-xs text-[#718096]">
          Immutable Trail of User Operator Actions, Gateway Events & System Access
        </p>
      </div>

      {/* Filters & Search */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#A0AEC0]" />
          <input
            type="text"
            placeholder="Search username, action or target..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full text-xs pl-9 pr-4 py-2 border border-[#CBD5E0] rounded bg-white text-[#1A202C]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#718096]" />
          <select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-white border border-[#CBD5E0] rounded px-3 py-2 text-[#1A202C]"
          >
            <option value="">All Severities</option>
            <option value="Info">Info</option>
            <option value="Warning">Warning</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm space-y-4">
        {isLoading ? (
          <div className="text-xs text-[#718096]">Loading audit logs...</div>
        ) : !data || data.logs.length === 0 ? (
          <div className="text-xs text-[#A0AEC0] py-8 text-center">
            No audit logs found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#4A5568] uppercase border-b border-[#E2E8F0]">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Operator User</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Target</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {data.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F8FAFC]">
                    <td className="p-3 font-semibold">#{log.id}</td>
                    <td className="p-3">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold text-[#002855]">
                      {log.username}
                    </td>
                    <td className="p-3 font-bold">{log.action}</td>
                    <td className="p-3 font-mono">{log.target}</td>
                    <td className="p-3">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                          log.severity === "Critical"
                            ? "bg-[#FDEDEC] text-[#E74C3C]"
                            : log.severity === "Warning"
                            ? "bg-[#FEF9E7] text-[#F39C12]"
                            : "bg-[#EBF5FB] text-[#2980B9]"
                        }`}
                      >
                        {log.severity}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-[#2ECC71]">
                      {log.result}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-[#F0F0F0] text-xs">
            <span className="text-[#718096]">
              Showing page {page} of {totalPages} ({data.total} total logs)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 border border-[#CBD5E0] rounded hover:bg-[#F8FAFC] disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 border border-[#CBD5E0] rounded hover:bg-[#F8FAFC] disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
