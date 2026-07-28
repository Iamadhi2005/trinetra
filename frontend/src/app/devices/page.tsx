"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { HardDrive, RefreshCw, Power } from "lucide-react";

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

export default function DevicesPage() {
  const queryClient = useQueryClient();

  const { data: devices = [], isLoading } = useQuery<Device[]>({
    queryKey: ["devices"],
    queryFn: () => fetchApi<Device[]>("/devices"),
    refetchInterval: 3000,
  });

  const actionMutation = useMutation({
    mutationFn: ({ device_id, action }: { device_id: string; action: string }) =>
      fetchApi("/devices/action", {
        method: "POST",
        body: JSON.stringify({ device_id, action }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#002855]">
          Clinical Device & Sensor Management
        </h1>
        <p className="text-xs text-[#718096]">
          Real-time IoMT Monitor Metadata, Firmware & Connection State Controls
        </p>
      </div>

      {isLoading ? (
        <div className="text-xs text-[#718096]">Loading devices...</div>
      ) : devices.length === 0 ? (
        <div className="bg-white border border-dashed border-[#CBD5E0] rounded-lg p-12 text-center text-xs text-[#A0AEC0]">
          No IoMT devices registered in backend database.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((d) => (
            <div
              key={d.id}
              className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-[#EBF3FA] flex items-center justify-center text-[#002855]">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#002855] text-sm">{d.name}</h3>
                    <div className="text-xs text-[#718096]">
                      Type: <b>{d.type}</b>
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    d.status === "Online"
                      ? "bg-[#E8F8F5] text-[#2ECC71] border border-[#A3E4D7]"
                      : "bg-[#FDEDEC] text-[#E74C3C] border border-[#FADBD8]"
                  }`}
                >
                  {d.status}
                </span>
              </div>

              <div className="text-xs space-y-1.5 pt-2 border-t border-[#F0F0F0] text-[#4A5568]">
                <div className="flex justify-between">
                  <span>Device ID:</span>
                  <code className="font-mono text-[#002855]">{d.id}</code>
                </div>
                <div className="flex justify-between">
                  <span>Patient ID:</span>
                  <code className="font-mono">{d.patient_id || "Unassigned"}</code>
                </div>
                <div className="flex justify-between">
                  <span>IP Address:</span>
                  <span className="font-mono">{d.ip_address}</span>
                </div>
                <div className="flex justify-between">
                  <span>Battery Level:</span>
                  <b className="text-[#2ECC71]">{d.battery}%</b>
                </div>
                <div className="flex justify-between">
                  <span>Firmware:</span>
                  <b className="text-[#002855]">{d.firmware_version}</b>
                </div>
              </div>

              <div className="pt-3 border-t border-[#F0F0F0] flex items-center gap-2">
                {d.status === "Online" ? (
                  <button
                    onClick={() =>
                      actionMutation.mutate({
                        device_id: d.id,
                        action: "disconnect",
                      })
                    }
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-[#FDEDEC] hover:bg-[#FADBD8] text-[#E74C3C] rounded text-xs font-semibold transition-colors"
                  >
                    <Power className="w-3.5 h-3.5" /> Disconnect Sensor
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      actionMutation.mutate({
                        device_id: d.id,
                        action: "reconnect",
                      })
                    }
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-[#E8F8F5] hover:bg-[#A3E4D7] text-[#2ECC71] rounded text-xs font-semibold transition-colors"
                  >
                    <Power className="w-3.5 h-3.5" /> Reconnect Sensor
                  </button>
                )}

                <button
                  onClick={() =>
                    actionMutation.mutate({
                      device_id: d.id,
                      action: "update_firmware",
                    })
                  }
                  className="flex items-center justify-center gap-1 px-3 py-1.5 bg-[#F8FAFC] hover:bg-[#EDF2F7] border border-[#CBD5E0] text-[#4A5568] rounded text-xs font-semibold transition-colors"
                  title="Update Firmware"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> OTA Update
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
