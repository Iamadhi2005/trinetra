"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { ShieldAlert, CheckCircle, Ban, RefreshCw } from "lucide-react";

interface SecurityEvent {
  id: number;
  timestamp: string;
  device_id: string;
  attack_type: string;
  client_ip: string;
  status: string;
  action_taken: string;
}

interface QuarantineItem {
  device_id: string;
  client_id: string;
  patient_id: string;
  reason: string;
  timestamp: number;
}

export default function SecurityPage() {
  const queryClient = useQueryClient();

  // Fetch Security Events
  const { data: events = [] } = useQuery<SecurityEvent[]>({
    queryKey: ["security-events"],
    queryFn: () => fetchApi<SecurityEvent[]>("/security/events"),
    refetchInterval: 3000,
  });

  // Fetch Quarantine Items
  const { data: quarantineItems = [] } = useQuery<QuarantineItem[]>({
    queryKey: ["quarantine"],
    queryFn: () => fetchApi<QuarantineItem[]>("/security/quarantine"),
    refetchInterval: 2000,
  });

  // Quarantine Action Mutation
  const actionMutation = useMutation({
    mutationFn: ({ device_id, action }: { device_id: string; action: string }) =>
      fetchApi("/security/quarantine/action", {
        method: "POST",
        body: JSON.stringify({ device_id, action }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quarantine"] });
      queryClient.invalidateQueries({ queryKey: ["security-events"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#002855]">
          Security Operations Center (SOC)
        </h1>
        <p className="text-xs text-[#718096]">
          Real-time Intrusion Prevention & Soft Quarantine Management
        </p>
      </div>

      {/* Active Quarantine Queue Section */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm space-y-4">
        <h2 className="font-bold text-[#002855] text-sm uppercase flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#EC7063]" /> Active Quarantine Queue
        </h2>

        {quarantineItems.length === 0 ? (
          <div className="bg-[#F8FAFC] border border-dashed border-[#CBD5E0] rounded-lg p-8 text-center text-xs text-[#718096]">
            No packets currently in quarantine. System operating normally.
          </div>
        ) : (
          <div className="space-y-3">
            {quarantineItems.map((item) => (
              <div
                key={item.device_id}
                className="bg-[#FDEDEC] border border-[#FADBD8] rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 text-xs text-[#78281F]">
                  <div className="font-bold text-sm">
                    Device: <code>{item.device_id}</code> | Patient: <code>{item.patient_id}</code>
                  </div>
                  <div><b>Reason:</b> {item.reason}</div>
                  <div><b>Client IP Node:</b> <code>{item.client_id}</code></div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      actionMutation.mutate({
                        device_id: item.device_id,
                        action: "override",
                      })
                    }
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#27AE60] hover:bg-[#1E8449] text-white text-xs font-semibold rounded shadow-sm transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Approve Override
                  </button>
                  <button
                    onClick={() =>
                      actionMutation.mutate({
                        device_id: item.device_id,
                        action: "hard_block",
                      })
                    }
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#C0392B] hover:bg-[#922B21] text-white text-xs font-semibold rounded shadow-sm transition-colors"
                  >
                    <Ban className="w-3.5 h-3.5" /> Hard Block
                  </button>
                  <button
                    onClick={() =>
                      actionMutation.mutate({
                        device_id: item.device_id,
                        action: "reset",
                      })
                    }
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#7F8C8D] hover:bg-[#626567] text-white text-xs font-semibold rounded shadow-sm transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Reset Node
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Events Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm space-y-4">
        <h2 className="font-bold text-[#002855] text-sm uppercase">
          IDS Detection Log History
        </h2>

        {events.length === 0 ? (
          <div className="text-xs text-[#A0AEC0] py-6 text-center">
            No security detection logs recorded in backend.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#4A5568] uppercase border-b border-[#E2E8F0]">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Device ID</th>
                  <th className="p-3">Attack Category</th>
                  <th className="p-3">Client Node</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Action Taken</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {events.map((e) => (
                  <tr key={e.id} className="hover:bg-[#F8FAFC]">
                    <td className="p-3 font-semibold">#{e.id}</td>
                    <td className="p-3">
                      {new Date(e.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 font-mono">{e.device_id}</td>
                    <td className="p-3 font-bold text-[#C0392B]">{e.attack_type}</td>
                    <td className="p-3 font-mono">{e.client_ip}</td>
                    <td className="p-3 font-semibold text-[#E67E22]">{e.status}</td>
                    <td className="p-3">{e.action_taken}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
