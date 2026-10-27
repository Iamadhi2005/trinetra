import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
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

  // Dynamic waveform animation tick
  const [ecgPhase, setEcgPhase] = useState<number>(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setEcgPhase((p) => (p + 1) % 18);
    }, 450);
    return () => clearInterval(interval);
  }, []);

  // Base clinical readings
  const hr = isAttacking ? 134 : 72;
  const spo2 = isAttacking ? 89 : 98;
  const rr = isAttacking ? 26 : 16;
  const bp = isAttacking ? "148/96" : "120/80";

  // Dynamic bar height series representing continuous ECG waveform lead II
  const baselineWave = [14, 18, 22, 54, 98, -38, 20, 24, 18, 16, 22, 58, 94, -36, 18, 26, 20, 16];
  const renderedWave = baselineWave.map((v, i) => {
    const shiftIdx = (i + ecgPhase) % baselineWave.length;
    return baselineWave[shiftIdx];
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Real-time Physiological Vitals & Waveform Card */}
      <View style={styles.vitalsCard}>
        <View style={styles.cardHeaderRow}>
          <MaterialCommunityIcons name="heart-pulse" size={20} color="#00FF66" />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>CONTINUOUS CLINICAL TELEMETRY</Text>
            <Text style={styles.cardSub}>Lead II ECG • SpO₂ Photoplethysmography • Non-invasive Hemodynamics</Text>
          </View>
          <View style={[styles.statusTag, { backgroundColor: isAttacking ? "rgba(239, 68, 68, 0.2)" : "rgba(0, 255, 102, 0.15)" }]}>
            <Text style={[styles.statusTagText, { color: isAttacking ? "#F87171" : "#00FF66" }]}>
              {isAttacking ? "ANOMALY FLAGGED" : "NORMAL SINUS"}
            </Text>
          </View>
        </View>

        {/* Data Integrity Status Banner (Requirement 5) */}
        <View
          style={[
            styles.integrityBanner,
            {
              backgroundColor: isAttacking ? "rgba(239, 68, 68, 0.15)" : "rgba(0, 255, 102, 0.12)",
              borderColor: isAttacking ? "#EF4444" : "#00FF66",
            },
          ]}
        >
          <MaterialCommunityIcons
            name={isAttacking ? "shield-alert" : "shield-check"}
            size={16}
            color={isAttacking ? "#EF4444" : "#00FF66"}
          />
          <Text
            style={[
              styles.integrityBannerText,
              { color: isAttacking ? "#FCA5A5" : "#86EFAC" },
            ]}
          >
            {isAttacking
              ? "DATA INTEGRITY: UNTRUSTED • TELEMETRY SENSOR SPOOFED"
              : "DATA INTEGRITY: VERIFIED • SENSOR CRYPTOGRAPHICALLY AUTHENTIC"}
          </Text>
        </View>

        {/* Vitals Grid */}
        <View style={styles.vitalsGrid}>
          <View style={styles.vitalBox}>
            <Text style={styles.vitalLabel}>HEART RATE</Text>
            <Text style={[styles.vitalValue, { color: isAttacking ? "#EF4444" : "#00FF66" }]}>
              {hr}
            </Text>
            <Text style={styles.vitalUnit}>BPM</Text>
          </View>

          <View style={styles.vitalBox}>
            <Text style={styles.vitalLabel}>SpO₂ OXYGEN</Text>
            <Text style={[styles.vitalValue, { color: isAttacking ? "#FBBF24" : "#38BDF8" }]}>
              {spo2}%
            </Text>
            <Text style={styles.vitalUnit}>Saturation</Text>
          </View>

          <View style={styles.vitalBox}>
            <Text style={styles.vitalLabel}>RESPIRATION</Text>
            <Text style={[styles.vitalValue, { color: isAttacking ? "#F97316" : "#A78BFA" }]}>
              {rr}
            </Text>
            <Text style={styles.vitalUnit}>BrPM</Text>
          </View>

          <View style={styles.vitalBox}>
            <Text style={styles.vitalLabel}>BLOOD PRESSURE</Text>
            <Text style={[styles.vitalValue, { color: isAttacking ? "#F87171" : "#F1F5F9", fontSize: 13 }]}>
              {bp}
            </Text>
            <Text style={styles.vitalUnit}>mmHg (MAP 98)</Text>
          </View>
        </View>

        {/* Dynamic ECG Waveform Canvas */}
        <View style={styles.waveformBox}>
          <View style={styles.waveHeader}>
            <Text style={styles.waveTitle}>REAL-TIME ECG LEAD II (mV)</Text>
            <Text style={styles.waveScale}>25 mm/s • 10 mm/mV</Text>
          </View>
          <View style={styles.waveBarsRow}>
            {renderedWave.map((h, idx) => (
              <View
                key={idx}
                style={[
                  styles.waveBar,
                  {
                    height: Math.abs(h) * 0.45 + 4,
                    backgroundColor: isAttacking ? "#EF4444" : "#00FF66",
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Testbed Security Status Card */}
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

      {/* IPS Quarantine Queue Section */}
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
            if (log.type === "error") textColor = "#FBBF24";

            return (
              <View key={log.id} style={styles.logRow}>
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
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  vitalsCard: {
    backgroundColor: "#0D1527",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  cardSub: {
    fontSize: 8.5,
    color: "#64748B",
    marginTop: 1,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusTagText: {
    fontSize: 8.5,
    fontWeight: "bold",
  },
  integrityBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    gap: 8,
  },
  integrityBannerText: {
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  vitalsGrid: {
    flexDirection: "row",
    gap: 8,
  },
  vitalBox: {
    flex: 1,
    backgroundColor: "#070B14",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
  },
  vitalLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#94A3B8",
    textAlign: "center",
  },
  vitalValue: {
    fontSize: 16,
    fontWeight: "900",
    marginVertical: 2,
  },
  vitalUnit: {
    fontSize: 7.5,
    color: "#64748B",
  },
  waveformBox: {
    backgroundColor: "#070B14",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 8,
    padding: 10,
  },
  waveHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  waveTitle: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: "#00FF66",
  },
  waveScale: {
    fontSize: 8,
    color: "#64748B",
  },
  waveBarsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 44,
    paddingHorizontal: 6,
  },
  waveBar: {
    width: 8,
    borderRadius: 2,
  },
  statusCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
  },
  statusCardNormal: {
    backgroundColor: "rgba(0, 255, 102, 0.05)",
    borderColor: "rgba(0, 255, 102, 0.2)",
  },
  statusCardAttack: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderColor: "#EF4444",
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
    fontSize: 12,
    fontWeight: "bold",
    color: "#F8FAFC",
    letterSpacing: 0.8,
  },
  statusSub: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },
  attributionBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(239, 68, 68, 0.2)",
    gap: 4,
  },
  attrRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  attrLabel: {
    fontSize: 10,
    color: "#94A3B8",
  },
  attrVal: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#CBD5E1",
    letterSpacing: 0.5,
  },
  refreshBtn: {
    padding: 4,
  },
  emptyQuarantine: {
    backgroundColor: "#0D1527",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 10,
    color: "#64748B",
  },
  quarantineList: {
    gap: 8,
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
    fontSize: 10,
    fontWeight: "bold",
    color: "#FBBF24",
    fontFamily: Platform.OS === "android" ? "monospace" : "Courier",
  },
  qPatient: {
    fontSize: 9,
    color: "#94A3B8",
  },
  qReason: {
    fontSize: 9.5,
    color: "#F8FAFC",
  },
  clearBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#1E293B",
    borderRadius: 4,
  },
  clearBtnText: {
    fontSize: 9,
    color: "#94A3B8",
    fontWeight: "bold",
  },
  consoleBox: {
    backgroundColor: "#070B14",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 8,
    padding: 10,
    minHeight: 120,
    maxHeight: 200,
  },
  consoleEmpty: {
    fontSize: 10,
    color: "#475569",
    textAlign: "center",
    marginTop: 40,
  },
  logRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  logTime: {
    fontSize: 9,
    color: "#64748B",
    fontFamily: Platform.OS === "android" ? "monospace" : "Courier",
  },
  logMsg: {
    fontSize: 9.5,
    flex: 1,
    fontFamily: Platform.OS === "android" ? "monospace" : "Courier",
  },
});
