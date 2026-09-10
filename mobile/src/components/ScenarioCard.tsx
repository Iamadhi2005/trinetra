import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AttackScenario } from "../types";

interface ScenarioCardProps {
  scenario: AttackScenario;
  isActive: boolean;
  onToggle: (mode: string) => void;
  loading: boolean;
  selectedPatient: string;
}

export const ScenarioCard: React.FC<ScenarioCardProps> = ({
  scenario,
  isActive,
  onToggle,
  loading,
  selectedPatient,
}) => {
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return { bg: "rgba(239, 68, 68, 0.2)", border: "#EF4444", text: "#F87171" };
      case "HIGH":
        return { bg: "rgba(249, 115, 22, 0.2)", border: "#F97316", text: "#FB923C" };
      case "WARNING":
        return { bg: "rgba(234, 179, 8, 0.2)", border: "#EAB308", text: "#FACC15" };
      default:
        return { bg: "rgba(0, 255, 102, 0.2)", border: "#00FF66", text: "#4ADE80" };
    }
  };

  const sevStyle = getSeverityStyle(scenario.severity);

  return (
    <View style={[styles.card, isActive && styles.activeCard]}>
      {/* Top Meta Info */}
      <View style={styles.topRow}>
        <Text style={styles.categoryText}>{scenario.category}</Text>
        <View
          style={[
            styles.severityBadge,
            { backgroundColor: sevStyle.bg, borderColor: sevStyle.border },
          ]}
        >
          <Text style={[styles.severityText, { color: sevStyle.text }]}>
            {scenario.severity}
          </Text>
        </View>
      </View>

      {/* Scenario Title */}
      <View style={styles.titleRow}>
        <MaterialCommunityIcons
          name={
            scenario.mode === "Override"
              ? "heart-pulse"
              : scenario.mode === "Drain"
              ? "battery-alert"
              : scenario.mode === "Fault"
              ? "alert-circle-outline"
              : scenario.mode === "DoS"
              ? "lan-disconnect"
              : scenario.mode === "MitM"
              ? "security-network"
              : scenario.mode === "Replay"
              ? "history"
              : "shield-key-outline"
          }
          size={20}
          color={isActive ? "#EF4444" : "#00FF66"}
        />
        <Text style={[styles.title, isActive && styles.activeTitle]}>
          {scenario.label}
        </Text>
      </View>

      {/* Description */}
      <Text style={styles.desc}>{scenario.desc}</Text>

      {/* Technical Details Box */}
      <View style={styles.detailBox}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Target:</Text>
          <Text style={styles.detailValue} numberOfLines={1}>
            {scenario.target}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Payload Effect:</Text>
          <Text style={styles.detailValue} numberOfLines={2}>
            {scenario.payloadEffect}
          </Text>
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={[
          styles.actionBtn,
          isActive ? styles.stopBtn : styles.deployBtn,
        ]}
        onPress={() => onToggle(scenario.mode)}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : isActive ? (
          <>
            <MaterialCommunityIcons name="stop-circle-outline" size={16} color="#FFFFFF" />
            <Text style={styles.stopBtnText}>DISENGAGE SCENARIO</Text>
          </>
        ) : (
          <>
            <MaterialCommunityIcons name="play-circle-outline" size={16} color="#00FF66" />
            <Text style={styles.deployBtnText}>
              DEPLOY ON {selectedPatient || "SELECTED NODE"}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0D1527",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  activeCard: {
    borderColor: "#EF4444",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 10,
    color: "#64748B",
    textTransform: "uppercase",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  severityBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#F8FAFC",
    flex: 1,
  },
  activeTitle: {
    color: "#EF4444",
  },
  desc: {
    fontSize: 11,
    color: "#94A3B8",
    lineHeight: 16,
    marginBottom: 10,
  },
  detailBox: {
    backgroundColor: "#070B14",
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1E293B",
    gap: 4,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    gap: 6,
  },
  detailLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "bold",
  },
  detailValue: {
    fontSize: 10,
    color: "#CBD5E1",
    flex: 1,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  deployBtn: {
    backgroundColor: "rgba(0, 255, 102, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 102, 0.4)",
  },
  deployBtnText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#00FF66",
    letterSpacing: 0.5,
  },
  stopBtn: {
    backgroundColor: "#EF4444",
  },
  stopBtnText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
});
