import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AttackState } from "../types";

interface HeaderProps {
  attackState: AttackState;
  elapsedSeconds: number;
  onDisengage: () => void;
  isConnected: boolean;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  attackState,
  elapsedSeconds,
  onDisengage,
  isConnected,
  onOpenSettings,
}) => {
  const isAttacking = attackState.attack_mode && attackState.attack_mode !== "Normal";

  return (
    <View style={styles.container}>
      {/* Top Brand Bar */}
      <View style={styles.topRow}>
        <View style={styles.brandContainer}>
          <MaterialCommunityIcons
            name="shield-bug-outline"
            size={24}
            color={isAttacking ? "#EF4444" : "#00FF66"}
          />
          <View>
            <Text style={styles.brandTitle}>TRINETRA MOBILE</Text>
            <Text style={styles.brandSubtitle}>IoMT IDS Testbed Remote Hub</Text>
          </View>
        </View>

        <View style={styles.statusRight}>
          <TouchableOpacity
            style={[styles.connectionPill, isConnected ? styles.connected : styles.disconnected]}
            onPress={onOpenSettings}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: isConnected ? "#00FF66" : "#EF4444" },
              ]}
            />
            <Text style={styles.connectionText}>
              {isConnected ? "ONLINE" : "OFFLINE"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Attack or Secure Banner */}
      {isAttacking ? (
        <View style={styles.attackBanner}>
          <View style={styles.attackInfo}>
            <View style={styles.attackBadge}>
              <MaterialCommunityIcons name="alert-decagram" size={14} color="#FFF" />
              <Text style={styles.attackBadgeText}>SCENARIO RUNNING</Text>
            </View>
            <Text style={styles.attackTitle}>
              {attackState.attack_label || attackState.attack_mode}
            </Text>
            <Text style={styles.attackTarget}>
              Target: <Text style={styles.boldText}>{attackState.target_patient || "All Nodes"}</Text> • Time: <Text style={styles.timerText}>{elapsedSeconds}s</Text>
            </Text>
          </View>

          <TouchableOpacity
            style={styles.stopButton}
            onPress={onDisengage}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="stop-circle" size={18} color="#FFF" />
            <Text style={styles.stopButtonText}>STOP</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.secureBanner}>
          <MaterialCommunityIcons name="shield-check" size={16} color="#00FF66" />
          <Text style={styles.secureText}>
            Testbed Telemetry Normal • Ready to Inject Test Scenario
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#070B14",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: 1.2,
  },
  brandSubtitle: {
    fontSize: 10,
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  statusRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  connectionPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
  },
  connected: {
    backgroundColor: "rgba(0, 255, 102, 0.1)",
    borderColor: "rgba(0, 255, 102, 0.3)",
  },
  disconnected: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  connectionText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#CBD5E1",
  },
  attackBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1.5,
    borderColor: "#EF4444",
    borderRadius: 8,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  attackInfo: {
    flex: 1,
    marginRight: 8,
  },
  attackBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF4444",
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
    marginBottom: 3,
  },
  attackBadgeText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  attackTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  attackTarget: {
    fontSize: 11,
    color: "#CBD5E1",
    marginTop: 2,
  },
  boldText: {
    color: "#00FF66",
    fontWeight: "bold",
  },
  timerText: {
    color: "#EF4444",
    fontWeight: "bold",
  },
  stopButton: {
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  stopButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
  },
  secureBanner: {
    backgroundColor: "rgba(0, 255, 102, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 102, 0.25)",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  secureText: {
    fontSize: 11,
    color: "#00FF66",
    fontWeight: "500",
  },
});
