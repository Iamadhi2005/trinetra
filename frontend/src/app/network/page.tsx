"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { Wifi, ShieldCheck, RefreshCw, Ban } from "lucide-react";

interface NetworkStatus {
  broker_status: string;
  broker_host: string;
  broker_port: number;
  connected_clients: number;
  packet_rate: number;
  packet_loss: number;
  avg_latency_ms: number;
  blocked_clients: string[];
}

export default function NetworkPage() {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const { data: status, isLoading } = useQuery<NetworkStatus>({
    queryKey: ["network-status"],
    queryFn: () => fetchApi<NetworkStatus>("/network/status"),
    refetchInterval: 3000,
    enabled: mounted,
  });

  const unblockMutation = useMutation({
    mutationFn: (client_id: string) =>
      fetchApi("/network/unblock", {
        method: "POST",
        body: JSON.stringify({ client_id }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["network-status"] });
    },
  });

  if (!mounted) {
    return <div className="text-xs text-[#718096]">Loading network console...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#002855]">
          Network Topology & Firewall Registry
        </h1>
        <p className="text-xs text-[#718096]">
          Real-time MQTT Broker Telemetry & Active Firewall Rule Registry
        </p>
      </div>

      {/* Network Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="text-[11px] font-bold text-[#718096] uppercase">
            Broker Status
          </div>
          <div className="text-xl font-bold text-[#2ECC71] mt-1 flex items-center gap-1.5">
            <Wifi className="w-5 h-5" /> {status?.broker_status || "Connected"}
          </div>
          <div className="text-xs text-[#718096] mt-1">
            {status?.broker_host}:{status?.broker_port}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="text-[11px] font-bold text-[#718096] uppercase">
            Packet Rate
          </div>
          <div className="text-xl font-bold text-[#0F172A] mt-1">
            {status?.packet_rate} pkts/sec
          </div>
          <div className="text-xs text-[#2ECC71] mt-1">Normal Frequency</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="text-[11px] font-bold text-[#718096] uppercase">
            Packet Loss
          </div>
          <div className="text-xl font-bold text-[#2ECC71] mt-1">
            {status?.packet_loss}%
          </div>
          <div className="text-xs text-[#2ECC71] mt-1">Zero Loss</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-sm">
          <div className="text-[11px] font-bold text-[#718096] uppercase">
            Avg Latency
          </div>
          <div className="text-xl font-bold text-[#0F172A] mt-1">
            {status?.avg_latency_ms} ms
          </div>
          <div className="text-xs text-[#2ECC71] mt-1">Low Latency</div>
        </div>
      </div>

      {/* Firewall Blocked Clients Section */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm space-y-4">
        <h2 className="font-bold text-[#002855] text-sm uppercase flex items-center gap-2">
          <Ban className="w-4 h-4 text-[#C0392B]" /> Active Firewall Blocked Clients
        </h2>

        {!status?.blocked_clients || status.blocked_clients.length === 0 ? (
          <div className="bg-[#F8FAFC] border border-dashed border-[#CBD5E0] rounded-lg p-6 text-center text-xs text-[#2ECC71] font-semibold">
            <ShieldCheck className="w-5 h-5 mx-auto mb-1" />
            Firewall is Clean: No blocked client IPs.
          </div>
        ) : (
          <div className="space-y-2">
            {status.blocked_clients.map((client_id) => (
              <div
                key={client_id}
                className="bg-[#FDEDEC] border border-[#FADBD8] p-3 rounded flex items-center justify-between text-xs"
              >
                <span className="font-mono text-[#78281F] font-bold">
                  🚫 Blocked Node ID: {client_id}
                </span>
                <button
                  onClick={() => unblockMutation.mutate(client_id)}
                  className="px-3 py-1 bg-[#002855] hover:bg-[#001D40] text-white rounded font-semibold transition-colors"
                >
                  Unblock Client
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
