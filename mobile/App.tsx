import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  Modal,
  Animated,
} from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import {
  initAndRegisterDevice,
  showLocalNotification,
  clearAllNotifications,
  setupNotificationChannels,
} from "./src/services/NotificationService";
import { alertWebSocket } from "./src/services/AlertWebSocketService";
import { alarmSound } from "./src/services/AlarmSoundService";

// Types & Config
import { Patient, AttackState, Alert, LogEntry, QuarantineItem, User } from "./src/types";
import {
  getServerUrl,
  setServerUrl,
  getAuthToken,
  setAuthToken,
  getCachedUser,
  setCachedUser,
  pingBackend,
  login,
  logout,
  getPatients,
  getAttackState,
  triggerAttack,
  disengageAll,
  getMyAlerts,
  resolveAlert,
  getQuarantineQueue,
} from "./src/config/api";

// Components & Screens
import { Header } from "./src/components/Header";
import { ScenariosScreen } from "./src/screens/ScenariosScreen";
import { AlertsScreen } from "./src/screens/AlertsScreen";
import { MonitorScreen } from "./src/screens/MonitorScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { LoginScreen } from "./src/screens/LoginScreen";

type TabType = "alerts" | "monitor" | "scenarios" | "settings";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("alerts");
  const [serverUrl, setLocalServerUrl] = useState<string>("http://10.0.2.2:8000");
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Data states
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>("patient_102");
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

  // Foreground In-App Alert Banner State
  const [inAppBanner, setInAppBanner] = useState<{
    visible: boolean;
    title: string;
    body: string;
    severity: string;
  }>({
    visible: false,
    title: "",
    body: "",
    severity: "Critical",
  });
  const bannerAnim = useRef(new Animated.Value(-120)).current;

  // Account Switch Modal
  const [switchAccountVisible, setSwitchAccountVisible] = useState<boolean>(false);

  // Timer Ref for attack duration
  const timerRef = useRef<any>(null);

  // Notification listener refs (expo-notifications)
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);
  const lastAlertCountRef = useRef<number>(0);

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

  // 1. Initial boot: load saved server URL, token, cached user, test ping
  useEffect(() => {
    async function init() {
      // Setup notification channels first (Android requires this before any notification)
      await setupNotificationChannels();

      const url = await getServerUrl();
      setLocalServerUrl(url);
      const savedToken = await getAuthToken();
      const savedUser = await getCachedUser();

      setToken(savedToken);
      setCurrentUser(savedUser);

      addLog(`Connecting to TRINETRA Gateway: ${url}`, "info");

      // If no token or user, default auto-authenticate as Doctor Sarah Connor for seamless initial start
      if (!savedToken || !savedUser) {
        try {
          const authRes = await login("dr.connor", "DoctorInit2026!");
          setToken(authRes.access_token);
          setCurrentUser(authRes.user);
          addLog("Authenticated as Dr. Sarah Connor (Cardiology ICU-A)", "defense");
          // Register device for push notifications after auto-login
          initAndRegisterDevice()
            .then((token) => {
              if (token) addLog(`Push token registered (${token.slice(0, 20)}...)`, "defense");
            })
            .catch(() => {});
        } catch {
          // If custom gateway isn't reached, allow manual sign in
        }
      } else if (savedToken) {
        // Already logged in — re-register device token (token may have refreshed)
        initAndRegisterDevice()
          .then((token) => {
            if (token) addLog(`Push token refreshed (${token.slice(0, 20)}...)`, "defense");
          })
          .catch(() => {});
      }

      await checkConnection();
      await fetchInitialData();
    }
    init();
  }, []);

  // Subscribe to expo-notifications events and real-time alert WebSocket
  useEffect(() => {
    // Connect to real-time WebSocket alert channel
    alertWebSocket.connect();
    const unsubscribeWs = alertWebSocket.subscribe((data) => {
      addLog(`🚨 INSTANT ATTACK RECEIVED: ${data.title || data.severity}`, "exploit");
      triggerForegroundNotification(
        data.title || `🚨 ${data.severity?.toUpperCase() || 'CRITICAL'} ALERT`,
        data.body || data.message || "IoMT exploit identified on patient monitor.",
        data.severity || "Critical"
      );
      // Immediately refresh alert list
      syncState().catch(() => {});
    });

    // Foreground notification received — show in-app banner
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const content = notification.request.content;
        const data = content.data as any;
        alarmSound.playEmergencyBeep();
        triggerForegroundNotification(
          content.title || "TRINETRA Alert",
          content.body || "",
          data?.severity || "High"
        );
        // Also refresh alerts list
        syncState().catch(() => {});
      }
    );

    // User tapped a notification — navigate to Alerts tab
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        setActiveTab("alerts");
        syncState().catch(() => {});
      }
    );

    return () => {
      unsubscribeWs();
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  // 2. Periodic sync for attack state & account-specific alerts (every 1.5 seconds)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (token) {
        await syncState();
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [selectedPatient, token, currentUser]);

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
    } catch (err: any) {
      setIsConnected(false);
      return false;
    }
  };

  const fetchInitialData = async () => {
    try {
      const pList = await getPatients();
      setPatients(pList);
      if (pList.length > 0 && !selectedPatient) {
        setSelectedPatient(pList[0].id);
      }
    } catch (err: any) {
      addLog(`Failed to fetch patients: ${err.message}`, "error");
    }

    try {
      const qList = await getQuarantineQueue();
      setQuarantine(qList);
    } catch {}

    await syncState();
  };

  const syncState = async () => {
    try {
      const [state, alts, qList] = await Promise.all([
        getAttackState().catch(() => attackState),
        getMyAlerts().catch(() => alerts),
        getQuarantineQueue().catch(() => quarantine),
      ]);

      setAttackState(state);
      setQuarantine(qList);

      // Check if new unresolved alerts arrived since last sync
      const newCount = alts.filter((a) => a.status === "Unresolved").length;
      if (alts.length > lastAlertCountRef.current && alts.length > 0) {
        const newest = alts[0];
        if (newest.status === "Unresolved") {
          const sev = newest.severity as "Critical" | "High" | "Info";
          // Play loud emergency beep sound
          alarmSound.playEmergencyBeep();
          // Foreground in-app banner
          triggerForegroundNotification(
            `🚨 ${newest.severity?.toUpperCase()} ALERT: ${newest.patient_name || newest.patient_id}`,
            newest.message,
            newest.severity
          );
          // Also fire local system notification (visible when minimised / screen off)
          showLocalNotification(
            `TRINETRA: ${newest.severity} Alert`,
            newest.message.length > 80 ? newest.message.slice(0, 80) + "..." : newest.message,
            { alert_id: newest.id, severity: newest.severity, patient_id: newest.patient_id },
            ["Critical", "High", "Info"].includes(sev) ? sev : "High"
          ).catch(() => {});
        }
      }
      lastAlertCountRef.current = alts.length;

      setAlerts(alts);
      setIsConnected(true);
    } catch (err: any) {
      setIsConnected(false);
    }
  };

  // Trigger rich foreground in-app alert banner
  const triggerForegroundNotification = (title: string, body: string, severity: string = "Critical") => {
    setInAppBanner({ visible: true, title, body, severity });
    Animated.sequence([
      Animated.timing(bannerAnim, {
        toValue: Platform.OS === "android" ? 36 : 48,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.delay(5500),
      Animated.timing(bannerAnim, {
        toValue: -140,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setInAppBanner((prev) => ({ ...prev, visible: false }));
    });
  };

  const handleLoginSuccess = async (user: User, newToken: string) => {
    setCurrentUser(user);
    setToken(newToken);
    lastAlertCountRef.current = 0;
    addLog(`Signed in as ${user.name} (${user.role})`, "defense");
    // Connect real-time alert socket
    alertWebSocket.connect();
    // Register push token for this account
    initAndRegisterDevice()
      .then((tok) => {
        if (tok) addLog(`Push notifications active (${tok.slice(0, 20)}...)`, "defense");
      })
      .catch(() => {});
    await fetchInitialData();
  };

  const handleLogout = async () => {
    alertWebSocket.disconnect();
    await logout();
    setToken(null);
    setCurrentUser(null);
    lastAlertCountRef.current = 0;
    // Clear badge and lock-screen notifications on logout
    clearAllNotifications().catch(() => {});
    addLog("Signed out. Device registration deactivated. Notifications cleared.", "info");
  };

  const handleQuickSwitchUser = async (u: string, p: string) => {
    setSwitchAccountVisible(false);
    try {
      const res = await login(u, p);
      await handleLoginSuccess(res.user, res.access_token);
    } catch (err: any) {
      addLog(`Quick switch failed: ${err.message}`, "error");
    }
  };

  const handleTriggerScenario = async (mode: string) => {
    setLoadingAction(true);
    addLog(`Triggering attack scenario: ${mode} on patient ${selectedPatient}`, "exploit");
    try {
      const res = await triggerAttack(mode, selectedPatient);
      addLog(res.message || `Scenario ${mode} initiated`, "exploit");
      await syncState();
    } catch (err: any) {
      addLog(`Failed to trigger scenario: ${err.message}`, "error");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDisengageAll = async () => {
    setLoadingAction(true);
    addLog("Disengaging all attack vectors... Normalizing testbed", "defense");
    try {
      const res = await disengageAll();
      addLog(res.message || "All vectors neutralized", "defense");
      await syncState();
    } catch (err: any) {
      addLog(`Disengage failed: ${err.message}`, "error");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleResolveAlert = async (id: number) => {
    setResolvingId(id);
    try {
      await resolveAlert(id, `Resolved by ${currentUser?.name || "Physician"} via Mobile Console`);
      addLog(`Alert #${id} resolved & audited`, "defense");
      await syncState();
    } catch (err: any) {
      addLog(`Resolve failed: ${err.message}`, "error");
    } finally {
      setResolvingId(null);
    }
  };

  const handleManualRefreshAlerts = async () => {
    setRefreshingAlerts(true);
    try {
      const updated = await getMyAlerts();
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
    addLog(`Server URL updated: ${url}`, "info");
  };

  const handleTestConnection = async () => {
    const start = Date.now();
    try {
      const res = await pingBackend();
      const latency = Date.now() - start;
      setIsConnected(true);
      return { ok: true, latency, msg: `Online: ${res.name || "TRINETRA Gateway"}` };
    } catch (err: any) {
      setIsConnected(false);
      return { ok: false, latency: 0, msg: err.message };
    }
  };

  // If user is not logged in, render the secure LoginScreen
  if (!token || !currentUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ExpoStatusBar style="light" />
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          serverUrl={serverUrl}
          onSaveServerUrl={handleSaveServerUrl}
        />
      </SafeAreaView>
    );
  }

  const unresolvedAlertCount = alerts.filter((a) => a.status === "Unresolved").length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ExpoStatusBar style="light" />

      {/* Floating Foreground Audible Alert Banner */}
      <Animated.View
        style={[
          styles.inAppBanner,
          {
            transform: [{ translateY: bannerAnim }],
            borderColor: inAppBanner.severity === "Critical" ? "#EF4444" : "#FACC15",
          },
        ]}
      >
        <View style={styles.bannerIconBox}>
          <MaterialCommunityIcons name="bell-ring" size={20} color="#EF4444" />
        </View>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerTitle}>{inAppBanner.title}</Text>
          <Text style={styles.bannerBody} numberOfLines={2}>
            {inAppBanner.body}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            bannerAnim.setValue(-140);
            setActiveTab("alerts");
          }}
        >
          <MaterialCommunityIcons name="open-in-new" size={18} color="#00FF66" />
        </TouchableOpacity>
      </Animated.View>

      {/* Header Bar */}
      <Header
        attackState={attackState}
        elapsedSeconds={elapsedSeconds}
        onDisengage={handleDisengageAll}
        isConnected={isConnected}
        onOpenSettings={() => setActiveTab("settings")}
      />

      {/* Account Info & Switch Bar */}
      <View style={styles.accountBar}>
        <View style={styles.accountLeft}>
          <MaterialCommunityIcons
            name={
              currentUser.role === "Doctor"
                ? "doctor"
                : currentUser.role === "Patient"
                ? "account-heart"
                : currentUser.role === "Tech"
                ? "shield-bug"
                : "shield-crown"
            }
            size={16}
            color="#00FF66"
          />
          <Text style={styles.accountText}>
            <Text style={{ fontWeight: "bold", color: "#F8FAFC" }}>{currentUser.name}</Text>{" "}
            ({currentUser.role} • {currentUser.department || "Clinical"})
          </Text>
        </View>

        <TouchableOpacity
          style={styles.switchAccountBtn}
          onPress={() => setSwitchAccountVisible(true)}
        >
          <MaterialCommunityIcons name="account-switch" size={13} color="#00FF66" />
          <Text style={styles.switchAccountText}>SWITCH</Text>
        </TouchableOpacity>
      </View>

      {/* Main Screen Body */}
      <View style={styles.screenContainer}>
        {activeTab === "alerts" && (
          <AlertsScreen
            alerts={alerts}
            onRefresh={handleManualRefreshAlerts}
            refreshing={refreshingAlerts}
            onResolveAlert={handleResolveAlert}
            resolvingId={resolvingId}
            currentUser={currentUser}
            onTriggerInAppAlert={triggerForegroundNotification}
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
        {activeTab === "settings" && (
          <SettingsScreen
            serverUrl={serverUrl}
            onSaveServerUrl={handleSaveServerUrl}
            onTestConnection={handleTestConnection}
            currentUser={currentUser}
            token={token}
            onLogout={handleLogout}
          />
        )}
      </View>

      {/* Bottom Navigation Tabs */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === "alerts" && styles.activeNavItem]}
          onPress={() => setActiveTab("alerts")}
        >
          <View>
            <MaterialCommunityIcons
              name="bell-alert-outline"
              size={22}
              color={activeTab === "alerts" ? "#00FF66" : "#64748B"}
            />
            {unresolvedAlertCount > 0 && (
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>{unresolvedAlertCount}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.navText, activeTab === "alerts" && styles.activeNavText]}>
            ALERTS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === "monitor" && styles.activeNavItem]}
          onPress={() => setActiveTab("monitor")}
        >
          <MaterialCommunityIcons
            name="chart-line-variant"
            size={22}
            color={activeTab === "monitor" ? "#00FF66" : "#64748B"}
          />
          <Text style={[styles.navText, activeTab === "monitor" && styles.activeNavText]}>
            TELEMETRY
          </Text>
        </TouchableOpacity>

        {currentUser.role !== "Patient" ? (
          <TouchableOpacity
            style={[styles.navItem, activeTab === "scenarios" && styles.activeNavItem]}
            onPress={() => setActiveTab("scenarios")}
          >
            <MaterialCommunityIcons
              name="play-network-outline"
              size={22}
              color={activeTab === "scenarios" ? "#00FF66" : "#64748B"}
            />
            <Text style={[styles.navText, activeTab === "scenarios" && styles.activeNavText]}>
              SCENARIOS
            </Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.navItem, activeTab === "settings" && styles.activeNavItem]}
          onPress={() => setActiveTab("settings")}
        >
          <MaterialCommunityIcons
            name={currentUser.role === "Admin" ? "shield-account" : "cog-outline"}
            size={22}
            color={activeTab === "settings" ? "#00FF66" : "#64748B"}
          />
          <Text style={[styles.navText, activeTab === "settings" && styles.activeNavText]}>
            {currentUser.role === "Admin" ? "ADMIN" : "ACCOUNT"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Fast Account Switch Modal */}
      <Modal visible={switchAccountVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.switchModalCard}>
            <View style={styles.switchModalHeader}>
              <MaterialCommunityIcons name="account-switch" size={22} color="#00FF66" />
              <Text style={styles.switchModalTitle}>SWITCH VERIFIED ACCOUNT</Text>
              <TouchableOpacity onPress={() => setSwitchAccountVisible(false)}>
                <MaterialCommunityIcons name="close" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.switchModalDesc}>
              Select an account to demonstrate individual notification isolation:
            </Text>

            <View style={styles.switchList}>
              {[
                { name: "Dr. Sarah Connor", user: "dr.connor", role: "Doctor", pass: "DoctorInit2026!" },
                { name: "Dr. Radhi", user: "dr.radhi", role: "Doctor", pass: "DoctorInit2026!" },
                { name: "Robert Smith (Patient 102)", user: "pt.smith", role: "Patient", pass: "PatientCare2026!" },
                { name: "Techie Batman (Lead SOC)", user: "tech.batman", role: "Tech", pass: "TechSec2026!" },
                { name: "Chief SOC Admin", user: "admin", role: "Admin", pass: "admin123" },
              ].map((acc) => (
                <TouchableOpacity
                  key={acc.user}
                  style={styles.switchItem}
                  onPress={() => handleQuickSwitchUser(acc.user, acc.pass)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchItemName}>{acc.name}</Text>
                    <Text style={styles.switchItemSub}>{acc.user} • {acc.role}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#00FF66" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#070B14",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  inAppBanner: {
    position: "absolute",
    top: 0,
    left: 12,
    right: 12,
    zIndex: 9999,
    backgroundColor: "#0D1527",
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    elevation: 8,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  bannerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  bannerBody: {
    fontSize: 9.5,
    color: "#CBD5E1",
    marginTop: 2,
    lineHeight: 13,
  },
  accountBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0A101D",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  accountLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  accountText: {
    fontSize: 9.5,
    color: "#94A3B8",
  },
  switchAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 255, 102, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 102, 0.3)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  switchAccountText: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: "#00FF66",
  },
  screenContainer: {
    flex: 1,
    backgroundColor: "#070B14",
  },
  bottomNav: {
    flexDirection: "row",
    height: 58,
    backgroundColor: "#0D1527",
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: 4,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  activeNavItem: {},
  navText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  activeNavText: {
    color: "#00FF66",
  },
  navBadge: {
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
  navBadgeText: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  switchModalCard: {
    width: "100%",
    backgroundColor: "#0D1527",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
  },
  switchModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  switchModalTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  switchModalDesc: {
    fontSize: 10,
    color: "#64748B",
    marginBottom: 12,
  },
  switchList: {
    gap: 8,
  },
  switchItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#070B14",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 8,
    padding: 10,
  },
  switchItemName: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  switchItemSub: {
    fontSize: 9,
    color: "#94A3B8",
  },
});
