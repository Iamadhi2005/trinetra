import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Alert } from "../types";

interface AlertItemProps {
  alert: Alert;
  onResolve: (alertId: number) => void;
  resolving: boolean;
}

export const AlertItem: React.FC<AlertItemProps> = ({
  alert,
  onResolve,
  resolving,
}) => {
  const isResolved = alert.status === "Resolved";

  const getSeverityStyle = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return { bg: "rgba(239, 68, 68, 0.2)", border: "#EF4444", text: "#F87171" };
      case "high":
        return { bg: "rgba(249, 115, 22, 0.2)", border: "#F97316", text: "#FB923C" };
      case "warning":
        return { bg: "rgba(234, 179, 8, 0.2)", border: "#EAB308", text: "#FACC15" };
      default:
        return { bg: "rgba(59, 130, 246, 0.2)", border: "#3B82F6", text: "#60A5FA" };
    }
  };

  const sev = getSeverityStyle(alert.severity);
  const formattedTime = new Date(alert.timestamp * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <View style={[styles.card, isResolved && styles.resolvedCard]}>
      {/* Top Header */}
      <View style={styles.topRow}>
        <View style={styles.leftMeta}>
          <View
            style={[
              styles.badge,
              { backgroundColor: sev.bg, borderColor: sev.border },
            ]}
          >
            <Text style={[styles.badgeText, { color: sev.text }]}>
              {alert.severity?.toUpperCase() || "ALERT"}
            </Text>
          </View>
          <Text style={styles.alertId}>#{alert.id}</Text>
        </View>

        <View style={styles.rightMeta}>
          <MaterialCommunityIcons name="clock-outline" size={12} color="#64748B" />
          <Text style={styles.timestamp}>{formattedTime}</Text>
        </View>
      </View>

      {/* Message */}
      <Text style={styles.message}>{alert.message}</Text>

      {/* Device & Patient Attribution */}
      <View style={styles.attribBox}>
        <View style={styles.attribRow}>
          <MaterialCommunityIcons name="account-outline" size={13} color="#94A3B8" />
          <Text style={styles.attribText}>
            Patient: <Text style={styles.boldText}>{alert.patient_name} ({alert.patient_id})</Text>
          </Text>
        </View>
        <View style={styles.attribRow}>
          <MaterialCommunityIcons name="devices" size={13} color="#94A3B8" />
          <Text style={styles.attribText}>
            Device: <Text style={styles.boldText}>{alert.device_name}</Text> ({alert.device_type})
          </Text>
        </View>
      </View>

      {/* Bottom Status & Resolve */}
      <View style={styles.bottomRow}>
        <View style={styles.statusPill}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isResolved ? "#10B981" : "#EF4444" },
            ]}
          />
          <Text style={[styles.statusLabel, { color: isResolved ? "#10B981" : "#F87171" }]}>
            {alert.status}
          </Text>
        </View>

        {!isResolved ? (
          <TouchableOpacity
            style={styles.resolveBtn}
            onPress={() => onResolve(alert.id)}
            disabled={resolving}
            activeOpacity={0.8}
          >
            {resolving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="check-circle-outline" size={14} color="#FFF" />
                <Text style={styles.resolveBtnText}>Resolve</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <Text style={styles.resolvedNotes}>
            {alert.resolution_notes || "Resolved"}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0D1527",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  resolvedCard: {
    opacity: 0.6,
    borderColor: "#0F172A",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  leftMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  alertId: {
    fontSize: 10,
    color: "#64748B",
    fontFamily: "monospace",
  },
  rightMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timestamp: {
    fontSize: 10,
    color: "#64748B",
  },
  message: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F1F5F9",
    marginBottom: 8,
    lineHeight: 17,
  },
  attribBox: {
    backgroundColor: "#070B14",
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1E293B",
    gap: 4,
    marginBottom: 10,
  },
  attribRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  attribText: {
    fontSize: 10,
    color: "#94A3B8",
  },
  boldText: {
    color: "#E2E8F0",
    fontWeight: "600",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  resolveBtn: {
    backgroundColor: "#1E293B",
    borderColor: "#334155",
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    gap: 4,
  },
  resolveBtnText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  resolvedNotes: {
    fontSize: 10,
    color: "#64748B",
    fontStyle: "italic",
  },
});
