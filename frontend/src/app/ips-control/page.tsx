"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { ShieldCheck, ToggleLeft, ToggleRight, Edit, Save, CheckCircle } from "lucide-react";

interface IPSRule {
  id: number;
  name: string;
  description: string;
  enabled: boolean;
  threshold: number;
}

export default function IpsControlPage() {
  const queryClient = useQueryClient();
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [tempThreshold, setTempThreshold] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Fetch IPS Rules
  const { data: rules = [], isLoading } = useQuery<IPSRule[]>({
    queryKey: ["ips-rules"],
    queryFn: () => fetchApi<IPSRule[]>("/ips/rules"),
  });

  // Toggle Mutation
  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      fetchApi(`/ips/rules/${id}/toggle`, {
        method: "POST",
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ips-rules"] });
      setSuccessMsg("IPS policy state updated successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
    },
  });

  // Threshold Mutation
  const thresholdMutation = useMutation({
    mutationFn: ({ id, threshold }: { id: number; threshold: number }) =>
      fetchApi(`/ips/rules/${id}/threshold`, {
        method: "POST",
        body: JSON.stringify({ threshold }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ips-rules"] });
      setEditingRuleId(null);
      setSuccessMsg("IPS threshold limit saved in SQLite.");
      setTimeout(() => setSuccessMsg(""), 3000);
    },
  });

  const handleEditThreshold = (rule: IPSRule) => {
    setEditingRuleId(rule.id);
    setTempThreshold(rule.threshold.toString());
  };

  const handleSaveThreshold = (id: number) => {
    const val = parseFloat(tempThreshold);
    if (isNaN(val)) {
      alert("Invalid numeric value.");
      return;
    }
    thresholdMutation.mutate({ id, threshold: val });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#002855]">
          Intrusion Prevention System (IPS) Policy Control
        </h1>
        <p className="text-xs text-[#718096]">
          Configure Dynamic Mitigation Policies, Outlier Limits & Hardware Quarantining Gates
        </p>
      </div>

      {successMsg && (
        <div className="bg-[#E8F8F5] border border-[#A3E4D7] text-[#117A65] text-xs font-semibold p-3 rounded flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {/* Rules Policy Grid */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm space-y-4">
        <h2 className="font-bold text-[#002855] text-sm uppercase flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#2ECC71]" /> Active Mitigation Rules
        </h2>

        {isLoading ? (
          <div className="text-xs text-[#718096]">Loading rules...</div>
        ) : rules.length === 0 ? (
          <div className="text-xs text-[#A0AEC0] py-6 text-center">
            No IPS Rules registered in database.
          </div>
        ) : (
          <div className="divide-y divide-[#F0F0F0] space-y-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="pt-4 first:pt-0 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Details */}
                <div className="space-y-1 max-w-xl">
                  <h3 className="font-bold text-[#002855] text-sm">
                    {rule.name}
                  </h3>
                  <p className="text-xs text-[#718096] leading-relaxed">
                    {rule.description}
                  </p>
                  <div className="text-[11px] text-[#2ECC71] font-semibold flex items-center gap-2">
                    <span>Threshold Limit:</span>
                    {editingRuleId === rule.id ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          value={tempThreshold}
                          onChange={(e) => setTempThreshold(e.target.value)}
                          className="w-20 px-2 py-0.5 border border-[#CBD5E0] bg-white text-[#1A202C] text-[10px] rounded"
                        />
                        <button
                          onClick={() => handleSaveThreshold(rule.id)}
                          className="p-1 text-[#2ECC71] hover:bg-[#E8F8F5] rounded"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="flex items-center gap-1.5 font-bold">
                        <code>{rule.threshold}</code>
                        <button
                          onClick={() => handleEditThreshold(rule)}
                          className="text-[#718096] hover:text-[#002855]"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </div>
                </div>

                {/* Switch Toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#4A5568]">
                    {rule.enabled ? "ACTIVE PREVENTION" : "MONITOR ONLY"}
                  </span>
                  <button
                    onClick={() =>
                      toggleMutation.mutate({
                        id: rule.id,
                        enabled: !rule.enabled,
                      })
                    }
                    className="focus:outline-none transition-colors"
                  >
                    {rule.enabled ? (
                      <ToggleRight className="w-10 h-10 text-[#2ECC71]" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-[#718096]" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
