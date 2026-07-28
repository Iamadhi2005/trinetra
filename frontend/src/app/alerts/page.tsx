"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { Bell, CheckCircle } from "lucide-react";

interface Alert {
  id: number;
  timestamp: string;
  device_id: string;
  patient_id: string;
  severity: string;
  message: string;
  status: string;
  resolution_notes: string;
}

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const { data: alerts = [] } = useQuery<Alert[]>({
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#002855]">
          Clinical Security Warnings & Alerts
        </h1>
        <p className="text-xs text-[#718096]">
          Real-time System Threat Notifications & Resolution Tracking
        </p>
      </div>

      {alerts.length === 0 ? (
        <div className="bg-white border border-dashed border-[#CBD5E0] rounded-lg p-12 text-center text-xs text-[#A0AEC0]">
          No active or historical alerts recorded in database.
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={`bg-white border rounded-lg p-5 shadow-sm space-y-3 ${
                a.status === "Unresolved"
                  ? "border-[#EC7063] bg-[#FDEDEC]/30"
                  : "border-[#E2E8F0]"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Bell
                    className={`w-5 h-5 ${
                      a.status === "Unresolved"
                        ? "text-[#EC7063]"
                        : "text-[#718096]"
                    }`}
                  />
                  <div>
                    <div className="font-bold text-[#002855] text-sm">
                      Alert #{a.id}: {a.message}
                    </div>
                    <div className="text-xs text-[#718096]">
                      Device: <code>{a.device_id || "System"}</code> | Patient:{" "}
                      <code>{a.patient_id || "N/A"}</code> | Severity:{" "}
                      <b className="text-[#E74C3C]">{a.severity}</b>
                    </div>
                  </div>
                </div>

                {a.status === "Unresolved" ? (
                  <button
                    onClick={() => setSelectedAlertId(a.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#27AE60] hover:bg-[#1E8449] text-white text-xs font-semibold rounded shadow-sm transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Resolve Alert
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-[#2ECC71] bg-[#E8F8F5] px-2.5 py-1 rounded border border-[#A3E4D7]">
                    Resolved
                  </span>
                )}
              </div>

              {selectedAlertId === a.id && (
                <div className="bg-white border border-[#CBD5E0] rounded p-4 space-y-3 pt-3">
                  <label className="block text-xs font-semibold text-[#4A5568]">
                    Resolution Notes
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter audit notes for resolving this alert..."
                    className="w-full text-xs p-2 border border-[#CBD5E0] rounded text-[#1A202C]"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setSelectedAlertId(null)}
                      className="px-3 py-1 text-xs text-[#718096]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() =>
                        resolveMutation.mutate({ id: a.id, notes })
                      }
                      className="px-4 py-1 bg-[#2ECC71] text-white text-xs font-semibold rounded"
                    >
                      Save Resolution
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
