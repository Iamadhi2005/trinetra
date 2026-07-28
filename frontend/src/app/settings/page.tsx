"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { Settings as SettingsIcon, Save, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [hmacKey, setHmacKey] = useState("");
  const [cusumThreshold, setCusumThreshold] = useState("");
  const [contaminationRate, setContaminationRate] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["settings"],
    queryFn: () => fetchApi<Record<string, string>>("/settings"),
  });

  useEffect(() => {
    if (settings) {
      setHmacKey(settings.hmac_key || "hospital_secure_key_2026");
      setCusumThreshold(settings.cusum_threshold || "6.0");
      setContaminationRate(settings.contamination_rate || "0.03");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, string>) =>
      fetchApi("/settings", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setSuccessMsg("System configuration updated and written to SQLite database.");
      setTimeout(() => setSuccessMsg(""), 4000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      hmac_key: hmacKey,
      cusum_threshold: cusumThreshold,
      contamination_rate: contaminationRate,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#002855]">
          System Security & Gateway Configuration
        </h1>
        <p className="text-xs text-[#718096]">
          Manage Cryptographic HMAC Signatures, CUSUM Drift Sensitivity & ML Thresholds
        </p>
      </div>

      {successMsg && (
        <div className="bg-[#E8F8F5] border border-[#A3E4D7] text-[#117A65] text-xs font-semibold p-3 rounded flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {successMsg}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-[#E2E8F0] rounded-lg p-6 shadow-sm space-y-6 max-w-2xl"
      >
        <div className="space-y-4">
          <h2 className="font-bold text-[#002855] text-sm uppercase flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-[#3498DB]" /> Cryptographic & IDS Parameters
          </h2>

          <div>
            <label className="block text-xs font-semibold text-[#4A5568] mb-1">
              HMAC Shared Secret Key
            </label>
            <input
              type="text"
              required
              value={hmacKey}
              onChange={(e) => setHmacKey(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-[#CBD5E0] rounded bg-white text-[#1A202C]"
            />
            <p className="text-[11px] text-[#718096] mt-1">
              Used to verify integrity of incoming sensor packet signatures.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4A5568] mb-1">
              CUSUM Drift Accumulation Limit
            </label>
            <input
              type="text"
              required
              value={cusumThreshold}
              onChange={(e) => setCusumThreshold(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-[#CBD5E0] rounded bg-white text-[#1A202C]"
            />
            <p className="text-[11px] text-[#718096] mt-1">
              Threshold for triggering Cumulative Sum (CUSUM) drift detection alarms.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4A5568] mb-1">
              Isolation Forest Contamination Rate
            </label>
            <input
              type="text"
              required
              value={contaminationRate}
              onChange={(e) => setContaminationRate(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-[#CBD5E0] rounded bg-white text-[#1A202C]"
            />
            <p className="text-[11px] text-[#718096] mt-1">
              Expected proportion of outliers in clinical telemetry stream.
            </p>
          </div>
        </div>

        <div className="flex justify-end border-t border-[#F0F0F0] pt-4">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-[#002855] hover:bg-[#001D40] text-white font-semibold rounded text-xs transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" /> Save Settings to Database
          </button>
        </div>
      </form>
    </div>
  );
}
