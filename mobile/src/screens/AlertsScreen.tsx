import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Alert, User, NotificationLog } from "../types";
import { AlertItem } from "../components/AlertItem";
import {
  getNotificationLogs,
  acknowledgeNotification,
  dispatchTestNotification,
} from "../config/api";

interface AlertsScreenProps {
  alerts: Alert[];
  onRefresh: () => void;
  refreshing: boolean;
  onResolveAlert: (id: number) => void;
  resolvingId: number | null;
  currentUser?: User | null;
  onTriggerInAppAlert?: (title: string, body: string, severity: string) => void;
}

export const AlertsScreen: React.FC<AlertsScreenProps> = ({
  alerts,
  onRefresh,
  refreshing,
  onResolveAlert,
  resolvingId,
  currentUser,
  onTriggerInAppAlert,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"ALERTS" | "DELIVERY_AUDIT">("ALERTS");
  const [filter, setFilter] = useState<string>("ALL");
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [testModalVisible, setTestModalVisible] = useState<boolean>(false);
  const [dispatchingTest, setDispatchingTest] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string>("");

  useEffect(() => {
    if (activeSubTab === "DELIVERY_AUDIT") {
      fetchLogs();
    }
  }, [activeSubTab]);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const logs = await getNotificationLogs();
      setNotificationLogs(logs);
    } catch (e) {
      console.warn("Failed to load logs:", e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleAckLog = async (logId: number) => {
    try {
      await acknowledgeNotification(logId);
      await fetchLogs();
    } catch (e) {
      console.warn("Failed to ack log:", e);
    }
  };

  const runNotificationSimulation = async (simState: "FOREGROUND" | "BACKGROUND" | "SCREEN_OFF") => {
    setDispatchingTest(true);
    setTestResult("");
    try {
      const res = await dispatchTestNotification(
        "ECG Waveform Spoofing",
        currentUser?.assigned_patient_id || "patient_102",
        "Critical"
      );
      setDispatchingTest(false);

      if (simState === "FOREGROUND") {
        onTriggerInAppAlert?.(
          "🚨 CRITICAL ALERT: ECG Waveform Spoofing Detected",
          "Attending Doctor Alerted: Anomaly detected on patient monitor. Heart rate 134 bpm. Sensor integrity UNTRUSTED.",
          "Critical"
        );
        setTestResult("Foreground Alert Triggered: In-app audible notification banner displayed.");
      } else if (simState === "BACKGROUND") {
        setTestResult(
          "Background Notification Emitted: FCM push message sent to registered token. High-priority Android notification channel activated with audible alert."
        );
      } else {
        setTestResult(
          "Screen-Off / Locked Alert: High-priority wake-lock triggered. Lock-screen notification displayed with privacy protection (clinical details masked until device unlock)."
        );
      }
      await fetchLogs();
      onRefresh();
    } catch (err: any) {
      setDispatchingTest(false);
      setTestResult("Simulation error: " + (err.message || "Gateway unreachable"));
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filter === "ALL") return true;
    if (filter === "UNRESOLVED") return a.status === "Unresolved";
    if (filter === "RESOLVED") return a.status === "Resolved";
    return a.severity?.toUpperCase() === filter;
  });

  const unresolvedCount = alerts.filter((a) => a.status === "Unresolved").length;

  return (
    <View style={styles.container}>
      {/* Account Routing Header Banner */}
      <View style={styles.userBanner}>
        <View style={styles.userLeft}>
          <MaterialCommunityIcons
            name={
              currentUser?.role === "Doctor"
                ? "doctor"
                : currentUser?.role === "Patient"
                ? "account-heart"
                : currentUser?.role === "Tech"
                ? "shield-bug"
                : "shield-crown"
            }
            size={18}
            color="#00FF66"
          />
          <View>
            <Text style={styles.userName}>{currentUser?.name || "Attending Physician"}</Text>
            <Text style={styles.userRoleText}>
              Role: <Text style={{ color: "#00FF66", fontWeight: "bold" }}>{currentUser?.role || "Doctor"}</Text> •{" "}
              {currentUser?.department || "Cardiology (ICU-A)"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.testStateBtn}
          onPress={() => setTestModalVisible(true)}
        >
          <MaterialCommunityIcons name="bell-ring" size={14} color="#070B14" />
          <Text style={styles.testStateBtnText}>TEST NOTIFICATION</Text>
        </TouchableOpacity>
      </View>

      {/* Subtabs: Active Alerts vs Delivery Audit History */}
      <View style={styles.subTabBar}>
        <TouchableOpacity
          style={[styles.subTabItem, activeSubTab === "ALERTS" && styles.activeSubTabItem]}
          onPress={() => setActiveSubTab("ALERTS")}
        >
          <Text style={[styles.subTabText, activeSubTab === "ALERTS" && styles.activeSubTabText]}>
            ACCOUNT ALERTS ({alerts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabItem, activeSubTab === "DELIVERY_AUDIT" && styles.activeSubTabItem]}
          onPress={() => setActiveSubTab("DELIVERY_AUDIT")}
        >
          <Text style={[styles.subTabText, activeSubTab === "DELIVERY_AUDIT" && styles.activeSubTabText]}>
            DELIVERY AUDIT LOGS
          </Text>
        </TouchableOpacity>
      </View>

      {activeSubTab === "ALERTS" ? (
        <>
          {/* Summary & Filters */}
          <View style={styles.filterRow}>
            {["ALL", "UNRESOLVED", "CRITICAL", "HIGH", "RESOLVED"].map((f) => {
              const isSelected = filter === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, isSelected && styles.selectedChip]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[styles.filterText, isSelected && styles.selectedFilterText]}>
                    {f}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Alert List */}
          <FlatList
            data={filteredAlerts}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <AlertItem
                alert={item}
                onResolve={onResolveAlert}
                resolving={resolvingId === item.id}
                currentUser={currentUser}
                onStatusChange={() => onRefresh()}
              />
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#00FF66"
                colors={["#00FF66"]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="shield-check-outline" size={48} color="#334155" />
                <Text style={styles.emptyTitle}>Zero Anomalies Active</Text>
                <Text style={styles.emptyDesc}>
                  {currentUser?.role === "Doctor"
                    ? "All telemetry streams for your assigned patients are authentic and within normal clinical ranges."
                    : currentUser?.role === "Patient"
                    ? "Your bedside monitors are operating normally. No safety alerts active."
                    : "The IDS engine has not flagged any anomalous telemetry payloads."}
                </Text>
              </View>
            }
          />
        </>
      ) : (
        /* Delivery Logs & Acknowledgment Audit Tab */
        <FlatList
          data={notificationLogs}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl
              refreshing={loadingLogs}
              onRefresh={fetchLogs}
              tintColor="#00FF66"
              colors={["#00FF66"]}
            />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.logCard}>
              <View style={styles.logTopRow}>
                <View style={styles.logBadge}>
                  <Text style={styles.logChannel}>{item.channel}</Text>
                </View>
                <Text style={styles.logTime}>
                  {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </Text>
              </View>

              <Text style={styles.logTitle}>{item.title}</Text>
              <Text style={styles.logBody}>{item.body}</Text>

              <View style={styles.logBottomRow}>
                <View style={styles.deliveryStatusRow}>
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          item.delivery_status === "Acknowledged"
                            ? "#00FF66"
                            : item.delivery_status === "Delivered"
                            ? "#38BDF8"
                            : "#FACC15",
                      },
                    ]}
                  />
                  <Text style={styles.deliveryStatusText}>{item.delivery_status}</Text>
                </View>

                {item.delivery_status !== "Acknowledged" ? (
                  <TouchableOpacity
                    style={styles.ackBtn}
                    onPress={() => handleAckLog(item.id)}
                  >
                    <MaterialCommunityIcons name="check" size={12} color="#070B14" />
                    <Text style={styles.ackBtnText}>ACKNOWLEDGE</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.ackNotice}>Acknowledged</Text>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={44} color="#334155" />
              <Text style={styles.emptyTitle}>No Notification Logs Yet</Text>
              <Text style={styles.emptyDesc}>
                Delivery attempts and acknowledgment timestamps will appear here when alerts trigger.
              </Text>
            </View>
          }
        />
      )}

      {/* Multi-App-State Testing Modal */}
      <Modal visible={testModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="cellphone-sound" size={26} color="#00FF66" />
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>NOTIFICATION STATE TEST HARNESS</Text>
                <Text style={styles.modalSub}>
                  Test account-specific alert delivery across all Android app lifecycle states:
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTestModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.simButtonsCol}>
              <TouchableOpacity
                style={styles.simBtn}
                onPress={() => runNotificationSimulation("FOREGROUND")}
                disabled={dispatchingTest}
              >
                <MaterialCommunityIcons name="application-outline" size={20} color="#00FF66" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.simBtnTitle}>1. App Open & Visible (Foreground)</Text>
                  <Text style={styles.simBtnDesc}>Displays in-app banner with high-priority audible alert tone.</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.simBtn}
                onPress={() => runNotificationSimulation("BACKGROUND")}
                disabled={dispatchingTest}
              >
                <MaterialCommunityIcons name="layers-outline" size={20} color="#38BDF8" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.simBtnTitle}>2. App Open in Background / Another App</Text>
                  <Text style={styles.simBtnDesc}>FCM remote push notification with sound channel.</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.simBtn}
                onPress={() => runNotificationSimulation("SCREEN_OFF")}
                disabled={dispatchingTest}
              >
                <MaterialCommunityIcons name="cellphone-lock" size={20} color="#FACC15" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.simBtnTitle}>3. Phone Screen Locked / Off</Text>
                  <Text style={styles.simBtnDesc}>High-priority wake alert with privacy lock-screen redaction.</Text>
                </View>
              </TouchableOpacity>
            </View>

            {testResult ? (
              <View style={styles.resultBox}>
                <MaterialCommunityIcons name="check-circle-outline" size={18} color="#00FF66" />
                <Text style={styles.resultText}>{testResult}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setTestModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>DONE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070B14",
  },
  userBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0D1527",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  userLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  userName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  userRoleText: {
    fontSize: 9.5,
    color: "#64748B",
    marginTop: 1,
  },
  testStateBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00FF66",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 5,
  },
  testStateBtnText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#070B14",
    letterSpacing: 0.5,
  },
  subTabBar: {
    flexDirection: "row",
    backgroundColor: "#0A101D",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  subTabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  activeSubTabItem: {
    borderBottomWidth: 2,
    borderBottomColor: "#00FF66",
  },
  subTabText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  activeSubTabText: {
    color: "#00FF66",
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  filterChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#0D1527",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  selectedChip: {
    backgroundColor: "rgba(0, 255, 102, 0.15)",
    borderColor: "#00FF66",
  },
  filterText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#64748B",
  },
  selectedFilterText: {
    color: "#00FF66",
  },
  listContent: {
    padding: 14,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#64748B",
  },
  emptyDesc: {
    fontSize: 11,
    color: "#475569",
    textAlign: "center",
    maxWidth: 260,
  },
  logCard: {
    backgroundColor: "#0D1527",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  logTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  logBadge: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    borderWidth: 1,
    borderColor: "#38BDF8",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  logChannel: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: "#38BDF8",
  },
  logTime: {
    fontSize: 9,
    color: "#64748B",
  },
  logTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  logBody: {
    fontSize: 10.5,
    color: "#94A3B8",
    lineHeight: 14,
    marginBottom: 8,
  },
  logBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    paddingTop: 8,
  },
  deliveryStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  deliveryStatusText: {
    fontSize: 9.5,
    color: "#E2E8F0",
    fontWeight: "bold",
  },
  ackBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00FF66",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  ackBtnText: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: "#070B14",
  },
  ackNotice: {
    fontSize: 9,
    color: "#00FF66",
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#0D1527",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 12,
    padding: 18,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    paddingBottom: 12,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  modalSub: {
    fontSize: 9.5,
    color: "#64748B",
    marginTop: 2,
  },
  simButtonsCol: {
    gap: 10,
    marginBottom: 14,
  },
  simBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#070B14",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 8,
    padding: 10,
    gap: 10,
  },
  simBtnTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  simBtnDesc: {
    fontSize: 9,
    color: "#64748B",
    marginTop: 2,
  },
  resultBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 255, 102, 0.1)",
    borderWidth: 1,
    borderColor: "#00FF66",
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  resultText: {
    fontSize: 10,
    color: "#86EFAC",
    flex: 1,
  },
  closeBtn: {
    backgroundColor: "#1E293B",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  closeBtnText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#94A3B8",
  },
});
