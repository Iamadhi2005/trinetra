import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AttackState, LogEntry, QuarantineItem } from "../types";

interface MonitorScreenProps {
  attackState: AttackState;
  logs: LogEntry[];
  onClearLogs: () => void;
  quarantine: QuarantineItem[];
  onRefreshQuarantine: () => void;
}

export const MonitorScreen: React.FC<MonitorScreenProps> = ({
  attackState,
  logs,
  onClearLogs,
  quarantine,
  onRefreshQuarantine,
}) => {
  const isAttacking = attackState.attack_mode && attackState.attack_mode !== "Normal";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Testbed Status Card */}
      <View style={[styles.statusCard, isAttacking ? styles.statusCardAttack : styles.statusCardNormal]}>
        <View style={styles.statusCardHeader}>
          <MaterialCommunityIcons
            name={isAttacking ? "alert-circle" : "shield-check"}
            size={22}
            color={isAttacking ? "#EF4444" : "#00FF66"}
          />
          <View style={styles.statusTitleGroup}>
            <Text style={styles.statusTitle}>
              {isAttacking ? "SYSTEM UNDER TEST ATTACK" : "TESTBED BASELINE SECURE"}
            </Text>
            <Text style={styles.statusSub}>
              {isAttacking
                ? `Active Vector: ${attackState.attack_mode}`
                : "Continuous Physiological & Network IDS Surveillance"}
            </Text>
          </View>
        </View>

        {isAttacking && (
          <View style={styles.attributionBox}>
            <View style={styles.attrRow}>
              <Text style={styles.attrLabel}>Target Patient:</Text>
              <Text style={styles.attrVal}>
                {attackState.target_patient_name || attackState.target_patient || "All Nodes"}
              </Text>
            </View>
            <View style={styles.attrRow}>
              <Text style={styles.attrLabel}>Target Device:</Text>
              <Text style={styles.attrVal}>
                {attackState.target_device_name || "ICU Telemetry Transceiver"}
              </Text>
            </View>
            <View style={styles.attrRow}>
              <Text style={styles.attrLabel}>Location:</Text>
              <Text style={styles.attrVal}>
                Ward {attackState.ward_number || "ICU"} • Bed {attackState.bed_number || "01"}
              </Text>
            </View>
            {attackState.alert_message ? (
              <View style={styles.attrRow}>
                <Text style={styles.attrLabel}>IDS Response:</Text>
                <Text style={[styles.attrVal, { color: "#F87171" }]}>
                  {attackState.alert_message}
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      {/* Quarantine Queue Section */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <MaterialCommunityIcons name="lock-alert-outline" size={16} color="#F59E0B" />
          <Text style={styles.sectionTitle}>IPS QUARANTINE QUEUE ({quarantine.length})</Text>
        </View>
        <TouchableOpacity onPress={onRefreshQuarantine} style={styles.refreshBtn}>
          <MaterialCommunityIcons name="refresh" size={14} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {quarantine.length === 0 ? (
        <View style={styles.emptyQuarantine}>
          <Text style={styles.emptyText}>Zero devices in quarantine isolation.</Text>
        </View>
      ) : (
        <View style={styles.quarantineList}>
          {quarantine.map((item, idx) => (
            <View key={idx} style={styles.quarantineItem}>
              <View style={styles.qTop}>
                <Text style={styles.qDev}>{item.device_id}</Text>
                <Text style={styles.qPatient}>Patient: {item.patient_id}</Text>
              </View>
              <Text style={styles.qReason}>{item.reason}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Console Audit Log */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <MaterialCommunityIcons name="console-line" size={16} color="#00FF66" />
          <Text style={styles.sectionTitle}>LIVE TESTBED EXECUTION LOG</Text>
        </View>
        <TouchableOpacity onPress={onClearLogs} style={styles.clearBtn}>
          <Text style={styles.clearBtnText}>CLEAR</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.consoleBox}>
        {logs.length === 0 ? (
          <Text style={styles.consoleEmpty}>No test events logged yet.</Text>
        ) : (
          logs.map((log) => {
            let textColor = "#00FF66";
            if (log.type === "exploit") textColor = "#F87171";
            if (log.type === "defense") textColor = "#60A5FA";
            if (log.type === "error") textColor = "#EF4444";

            return (
              <View key={log.id} style={styles.logLine}>
                <Text style={styles.logTime}>[{log.timestamp}]</Text>
                <Text style={[styles.logMsg, { color: textColor }]}>
                  {log.message}
                </Text>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070B14",
  },
  content: {
    padding: 14,
    paddingBottom: 40,
  },
  statusCard: {
    backgroundColor: "#0D1527",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusCardNormal: {
    borderColor: "rgba(0, 255, 102, 0.3)",
  },
  statusCardAttack: {
    borderColor: "#EF4444",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  statusCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusTitleGroup: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  statusSub: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },
  attributionBox: {
    backgroundColor: "#070B14",
    borderRadius: 6,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
    gap: 5,
  },
  attrRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  attrLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  attrVal: {
    fontSize: 10,
    color: "#E2E8F0",
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#E2E8F0",
    letterSpacing: 0.8,
  },
  refreshBtn: {
    padding: 4,
  },
  clearBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#1E293B",
    borderRadius: 4,
  },
  clearBtnText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#94A3B8",
  },
  emptyQuarantine: {
    backgroundColor: "#0D1527",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 11,
    color: "#64748B",
    fontStyle: "italic",
  },
  quarantineList: {
    gap: 8,
    marginBottom: 16,
  },
  quarantineItem: {
    backgroundColor: "#0D1527",
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 8,
    padding: 10,
  },
  qTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  qDev: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#FBBF24",
  },
  qPatient: {
    fontSize: 10,
    color: "#94A3B8",
  },
  qReason: {
    fontSize: 10,
    color: "#CBD5E1",
  },
  consoleBox: {
    backgroundColor: "#05080F",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 8,
    padding: 10,
    minHeight: 180,
    gap: 4,
  },
  consoleEmpty: {
    fontSize: 10,
    color: "#475569",
    fontStyle: "italic",
    padding: 8,
  },
  logLine: {
    flexDirection: "row",
    gap: 6,
  },
  logTime: {
    fontSize: 9,
    color: "#475569",
    fontFamily: "monospace",
  },
  logMsg: {
    fontSize: 10,
    fontFamily: "monospace",
    flex: 1,
  },
});
