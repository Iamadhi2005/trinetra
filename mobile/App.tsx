import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
} from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// Types & Config
import { Patient, AttackState, Alert, LogEntry, QuarantineItem } from "./src/types";
import {
  getServerUrl,
  setServerUrl,
  getAuthToken,
  setAuthToken,
  pingBackend,
  login,
  getPatients,
  getAttackState,
  triggerAttack,
  disengageAll,
  getAlerts,
  resolveAlert,
  getQuarantineQueue,
} from "./src/config/api";

// Components & Screens
import { Header } from "./src/components/Header";
import { ScenariosScreen } from "./src/screens/ScenariosScreen";
import { AlertsScreen } from "./src/screens/AlertsScreen";
import { MonitorScreen } from "./src/screens/MonitorScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";

type TabType = "scenarios" | "alerts" | "monitor" | "settings";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("scenarios");
  const [serverUrl, setLocalServerUrl] = useState<string>("https://soft-mirrors-clean.loca.lt");
  const [token, setToken] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Data states
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>("patient_101");
  const [attackState, setAttackState] = useState<AttackState>({
    attack_mode: "Normal",
    target_patient: "",
  });
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [quarantine, setQuarantine] = useState<QuarantineItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Loading flags
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [refreshingAlerts, setRefreshingAlerts] = useState<boolean>(false);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  // Timer Ref for attack duration
  const timerRef = useRef<any>(null);

  // Helper to append timestamped console log
  const addLog = (
    message: string,
    type: "info" | "exploit" | "defense" | "error" = "info"
  ) => {
    const timeStr = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setLogs((prev) => [
      {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: timeStr,
        message,
        type,
      },
      ...prev.slice(0, 70),
    ]);
  };

  // 1. Initial boot: load saved server URL, token, test ping, load patients & state
  useEffect(() => {
    async function init() {
      const url = await getServerUrl();
      setLocalServerUrl(url);
      const savedToken = await getAuthToken();
      setToken(savedToken);

      addLog(`Connecting to Trinetra Gateway: ${url}`, "info");

      // Auto-authenticate as default admin if no token exists yet
      if (!savedToken) {
        try {
          const authRes = await login("admin", "admin123");
          setToken(authRes.access_token);
          addLog("Authenticated as default SOC Operator (admin)", "defense");
        } catch {}
      }

      await checkConnection();
      await fetchInitialData();
    }
    init();
  }, []);

  // 2. Periodic sync for attack state & alerts (every 2.5 seconds)
  useEffect(() => {
    const interval = setInterval(async () => {
      await syncState();
    }, 2500);

    return () => clearInterval(interval);
  }, [selectedPatient]);

  // 3. Attack duration counter
  useEffect(() => {
    if (attackState.attack_mode && attackState.attack_mode !== "Normal") {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setElapsedSeconds((s) => s + 1);
        }, 1000);
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setElapsedSeconds(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [attackState.attack_mode]);

  const checkConnection = async () => {
    try {
      await pingBackend();
      setIsConnected(true);
      return true;
    } catch (e) {
      setIsConnected(false);
      return false;
    }
  };

  const fetchInitialData = async () => {
    try {
      const pList = await getPatients();
      if (pList && pList.length > 0) {
        setPatients(pList);
        setSelectedPatient((curr) => (curr ? curr : pList[0].id));
      }
    } catch {}

    await syncState();
  };

  const syncState = async () => {
    try {
      const state = await getAttackState();
      setAttackState(state);
      setIsConnected(true);

      // Refresh alerts if connected
      const alertList = await getAlerts();
      setAlerts(alertList);

      // Refresh quarantine
      const qList = await getQuarantineQueue();
      setQuarantine(qList);
    } catch (e) {
      // Don't flag offline immediately on temporary poll blip
    }
  };

  // ---------------- Handlers ---------------- //

  const handleTriggerScenario = async (mode: string) => {
    const isStopping = attackState.attack_mode === mode && mode !== "Normal";
    const nextMode = isStopping ? "Normal" : mode;
    const target = nextMode === "Normal" ? "" : selectedPatient;

    setLoadingAction(true);
    try {
      const res = await triggerAttack(nextMode, target);
      setAttackState(res.state || { attack_mode: nextMode, target_patient: target });

      if (nextMode === "Normal") {
        addLog(
          "Disengaged all test payloads. Telemetry restored to normal baseline.",
          "defense"
        );
      } else {
        addLog(
          `DEPLOYED: ${mode} scenario targeted at node ${target}. Monitoring IDS response...`,
          "exploit"
        );
      }
      await syncState();
    } catch (err: any) {
      addLog(`Failed to execute scenario: ${err.message}`, "error");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDisengageAll = async () => {
    setLoadingAction(true);
    try {
      await disengageAll();
      setAttackState({ attack_mode: "Normal", target_patient: "" });
      addLog("EMERGENCY DISENGAGE: All synthetic test vectors halted.", "defense");
      await syncState();
    } catch (err: any) {
      addLog(`Emergency halt error: ${err.message}`, "error");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleResolveAlert = async (alertId: number) => {
    setResolvingId(alertId);
    try {
      await resolveAlert(alertId, "Resolved remotely via Trinetra Mobile");
      addLog(`Alert #${alertId} marked as Resolved by Operator.`, "defense");
      const updated = await getAlerts();
      setAlerts(updated);
    } catch (err: any) {
      addLog(`Failed to resolve alert #${alertId}: ${err.message}`, "error");
    } finally {
      setResolvingId(null);
    }
  };

  const handleManualRefreshAlerts = async () => {
    setRefreshingAlerts(true);
    try {
      const updated = await getAlerts();
      setAlerts(updated);
      setIsConnected(true);
    } catch (err: any) {
      addLog(`Alert refresh failed: ${err.message}`, "error");
    } finally {
      setRefreshingAlerts(false);
    }
  };

  const handleSaveServerUrl = async (url: string) => {
    await setServerUrl(url);
    setLocalServerUrl(url);
    addLog(`Server URL updated to: ${url}`, "info");
  };

  const handleTestConnection = async (): Promise<{
    ok: boolean;
    latency: number;
    msg: string;
  }> => {
    const start = Date.now();
    try {
      const res = await pingBackend();
      const latency = Date.now() - start;
      setIsConnected(true);
      addLog(`Ping OK to ${res.name || "Gateway"} (${latency}ms)`, "defense");
      await fetchInitialData();
      return { ok: true, latency, msg: `Gateway Online: ${res.name || "TRINETRA"}` };
    } catch (err: any) {
      setIsConnected(false);
      addLog(`Ping failed: ${err.message}`, "error");
      return { ok: false, latency: 0, msg: `Connection failed: ${err.message}` };
    }
  };

  const handleLogin = async (
    user: string,
    pass: string
  ): Promise<{ ok: boolean; msg: string }> => {
    try {
      const res = await login(user, pass);
      setToken(res.access_token);
      addLog(`Successfully signed in as ${user}`, "defense");
      await syncState();
      return { ok: true, msg: "Authenticated successfully" };
    } catch (err: any) {
      addLog(`Authentication failed: ${err.message}`, "error");
      return { ok: false, msg: err.message };
    }
  };

  const handleLogout = async () => {
    await setAuthToken(null);
    setToken(null);
    addLog("Signed out from mobile session", "info");
  };

  const unresolvedAlertCount = alerts.filter((a) => a.status === "Unresolved").length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ExpoStatusBar style="light" />
      <Header
        attackState={attackState}
        elapsedSeconds={elapsedSeconds}
        onDisengage={handleDisengageAll}
        isConnected={isConnected}
        onOpenSettings={() => setActiveTab("settings")}
      />

      {/* Screen Body */}
      <View style={styles.screenContainer}>
        {activeTab === "scenarios" && (
          <ScenariosScreen
            patients={patients}
            selectedPatient={selectedPatient}
            onSelectPatient={setSelectedPatient}
            attackState={attackState}
            onTriggerScenario={handleTriggerScenario}
            onDisengageAll={handleDisengageAll}
            loading={loadingAction}
            onRefreshPatients={fetchInitialData}
          />
        )}
        {activeTab === "alerts" && (
          <AlertsScreen
            alerts={alerts}
            onRefresh={handleManualRefreshAlerts}
            refreshing={refreshingAlerts}
            onResolveAlert={handleResolveAlert}
            resolvingId={resolvingId}
          />
        )}
        {activeTab === "monitor" && (
          <MonitorScreen
            attackState={attackState}
            logs={logs}
            onClearLogs={() => setLogs([])}
            quarantine={quarantine}
            onRefreshQuarantine={syncState}
          />
        )}
        {activeTab === "settings" && (
          <SettingsScreen
            serverUrl={serverUrl}
            onSaveServerUrl={handleSaveServerUrl}
            onTestConnection={handleTestConnection}
            onLogin={handleLogin}
            token={token}
            onLogout={handleLogout}
          />
        )}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === "scenarios" && styles.activeTabItem]}
          onPress={() => setActiveTab("scenarios")}
        >
          <MaterialCommunityIcons
            name="target"
            size={22}
            color={activeTab === "scenarios" ? "#00FF66" : "#64748B"}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === "scenarios" && styles.activeTabLabel,
            ]}
          >
            Scenarios
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === "alerts" && styles.activeTabItem]}
          onPress={() => setActiveTab("alerts")}
        >
          <View>
            <MaterialCommunityIcons
              name="shield-alert-outline"
              size={22}
              color={activeTab === "alerts" ? "#00FF66" : "#64748B"}
            />
            {unresolvedAlertCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{unresolvedAlertCount}</Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === "alerts" && styles.activeTabLabel,
            ]}
          >
            Alerts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === "monitor" && styles.activeTabItem]}
          onPress={() => setActiveTab("monitor")}
        >
          <MaterialCommunityIcons
            name="monitor-dashboard"
            size={22}
            color={activeTab === "monitor" ? "#00FF66" : "#64748B"}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === "monitor" && styles.activeTabLabel,
            ]}
          >
            Monitor
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === "settings" && styles.activeTabItem]}
          onPress={() => setActiveTab("settings")}
        >
          <MaterialCommunityIcons
            name="cog-outline"
            size={22}
            color={activeTab === "settings" ? "#00FF66" : "#64748B"}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === "settings" && styles.activeTabLabel,
            ]}
          >
            Gateway
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#070B14",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: "#070B14",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#070B14",
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    paddingVertical: 8,
    paddingHorizontal: 8,
    justifyContent: "space-around",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 64,
  },
  activeTabItem: {
    backgroundColor: "rgba(0, 255, 102, 0.08)",
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 3,
  },
  activeTabLabel: {
    color: "#00FF66",
  },
  tabBadge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  tabBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "bold",
  },
});
