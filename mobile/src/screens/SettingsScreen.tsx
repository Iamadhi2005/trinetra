import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert as RNAlert,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  sanitizeUrl,
  getOrCreateDeviceId,
  getAdminAccounts,
  assignDoctorToPatient,
  resetUserPassword,
  disableUserAccount,
  enableUserAccount,
  getAuthorizedDevices,
  revokeAuthorizedDevice,
} from "../config/api";
import { User, DeviceRegistration } from "../types";

interface SettingsScreenProps {
  serverUrl: string;
  onSaveServerUrl: (url: string) => Promise<void>;
  onTestConnection: () => Promise<{ ok: boolean; latency: number; msg: string }>;
  currentUser?: User | null;
  token: string | null;
  onLogout: () => Promise<void>;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  serverUrl,
  onSaveServerUrl,
  onTestConnection,
  currentUser,
  token,
  onLogout,
}) => {
  const [inputUrl, setInputUrl] = useState(serverUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; latency: number; msg: string } | null>(null);

  const [deviceId, setDeviceId] = useState<string>("");
  const [adminAccounts, setAdminAccounts] = useState<User[]>([]);
  const [authorizedDevices, setAuthorizedDevices] = useState<DeviceRegistration[]>([]);
  const [loadingAdminData, setLoadingAdminData] = useState(false);

  // Admin action state
  const [assignPatientId, setAssignPatientId] = useState("patient_102");
  const [assignDoctorName, setAssignDoctorName] = useState("Dr. Sarah Connor");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    getOrCreateDeviceId().then(setDeviceId);
    if (currentUser?.role === "Admin") {
      loadAdminData();
    }
  }, [currentUser]);

  const loadAdminData = async () => {
    setLoadingAdminData(true);
    try {
      const [accs, devs] = await Promise.all([
        getAdminAccounts().catch(() => []),
        getAuthorizedDevices().catch(() => []),
      ]);
      setAdminAccounts(accs);
      setAuthorizedDevices(devs);
    } finally {
      setLoadingAdminData(false);
    }
  };

  const handleSaveUrl = async () => {
    const clean = sanitizeUrl(inputUrl);
    setInputUrl(clean);
    await onSaveServerUrl(clean);
    handleTestConnection();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await onTestConnection();
      setTestResult(res);
    } finally {
      setTesting(false);
    }
  };

  const handleAssignDoctor = async () => {
    if (!assignPatientId.trim() || !assignDoctorName.trim()) return;
    setAssigning(true);
    try {
      const res = await assignDoctorToPatient(assignPatientId.trim(), assignDoctorName.trim());
      RNAlert.alert("Success", res.message);
      await loadAdminData();
    } catch (e: any) {
      RNAlert.alert("Error", e.message || "Failed to assign doctor");
    } finally {
      setAssigning(false);
    }
  };

  const handleResetPassword = async (user: User) => {
    try {
      const res = await resetUserPassword(user.id);
      RNAlert.alert(
        "Temporary Password Issued",
        `User: ${res.username}\nNew Temporary Password: ${res.temporary_password}\n\nThe user must change this password on their next sign-in.`
      );
      await loadAdminData();
    } catch (e: any) {
      RNAlert.alert("Error", e.message || "Failed to reset password");
    }
  };

  const handleToggleAccount = async (user: User) => {
    try {
      if (user.is_active) {
        await disableUserAccount(user.id);
      } else {
        await enableUserAccount(user.id);
      }
      await loadAdminData();
    } catch (e: any) {
      RNAlert.alert("Error", e.message || "Failed to update account status");
    }
  };

  const handleRevokeDevice = async (regId: number) => {
    try {
      await revokeAuthorizedDevice(regId);
      RNAlert.alert("Device Revoked", "The selected physical device has been de-authorized.");
      await loadAdminData();
    } catch (e: any) {
      RNAlert.alert("Error", e.message || "Failed to revoke device");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User Account Profile Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <MaterialCommunityIcons name="account-circle" size={24} color="#00FF66" />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>AUTHENTICATED USER ACCOUNT</Text>
            <Text style={styles.cardSub}>Zero-trust authorized credentials and session scope</Text>
          </View>
        </View>

        <View style={styles.profileBox}>
          <View style={styles.profileRow}>
            <Text style={styles.profileKey}>Full Name:</Text>
            <Text style={styles.profileVal}>{currentUser?.name || "Not signed in"}</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileKey}>Username:</Text>
            <Text style={styles.profileValCode}>{currentUser?.username || "N/A"}</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileKey}>Role & Privilege:</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{currentUser?.role || "Viewer"}</Text>
            </View>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileKey}>Department:</Text>
            <Text style={styles.profileVal}>{currentUser?.department || "General Clinical"}</Text>
          </View>
          {currentUser?.assigned_patient_id ? (
            <View style={styles.profileRow}>
              <Text style={styles.profileKey}>Assigned Patient:</Text>
              <Text style={[styles.profileVal, { color: "#38BDF8" }]}>
                {currentUser.assigned_patient_id}
              </Text>
            </View>
          ) : null}
          <View style={styles.profileRow}>
            <Text style={styles.profileKey}>Account Status:</Text>
            <Text style={[styles.profileVal, { color: currentUser?.is_active ? "#00FF66" : "#EF4444" }]}>
              {currentUser?.is_active ? "Active & Authorized" : "Disabled"}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <MaterialCommunityIcons name="logout" size={16} color="#EF4444" />
          <Text style={styles.logoutBtnText}>LOGOUT & REVOKE DEVICE SESSION</Text>
        </TouchableOpacity>
      </View>

      {/* Push Notification & Registered Device Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <MaterialCommunityIcons name="cellphone-wireless" size={22} color="#38BDF8" />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>DEVICE TOKEN & FCM REGISTRATION</Text>
            <Text style={styles.cardSub}>Audited device binding for push notification delivery</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoKey}>Registered Physical Device UUID:</Text>
          <Text style={styles.infoValCode}>{deviceId || "Detecting..."}</Text>

          <Text style={[styles.infoKey, { marginTop: 8 }]}>FCM Notification Token Status:</Text>
          <View style={styles.tokenStatusRow}>
            <View style={styles.dotOnline} />
            <Text style={styles.tokenStatusText}>Token Active • Linked to {currentUser?.username}</Text>
          </View>

          <Text style={[styles.infoKey, { marginTop: 8 }]}>Android Notification Channels:</Text>
          <Text style={styles.channelDesc}>
            • <Text style={{ color: "#EF4444", fontWeight: "bold" }}>Critical Alert Channel:</Text> High priority, audible sound, heads-up banner{'\n'}
            • <Text style={{ color: "#38BDF8", fontWeight: "bold" }}>Clinical Care Channel:</Text> Standard sound, patient care updates{'\n'}
            • <Text style={{ color: "#FACC15", fontWeight: "bold" }}>Lock-Screen Redaction:</Text> Patient vitals hidden until device unlock
          </Text>
        </View>
      </View>

      {/* Administrator Control Console (Rendered for Admins) */}
      {currentUser?.role === "Admin" ? (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <MaterialCommunityIcons name="shield-crown" size={24} color="#FACC15" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: "#FACC15" }]}>HOSPITAL ADMINISTRATOR CONSOLE</Text>
              <Text style={styles.cardSub}>Doctor assignments, password resets & device authorization</Text>
            </View>
            <TouchableOpacity onPress={loadAdminData}>
              <MaterialCommunityIcons name="refresh" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Quick Doctor-to-Patient Assignment */}
          <Text style={styles.sectionHeader}>ASSIGN DOCTOR TO ADMITTED PATIENT</Text>
          <View style={styles.assignRow}>
            <TextInput
              style={[styles.adminInput, { flex: 1 }]}
              value={assignPatientId}
              onChangeText={setAssignPatientId}
              placeholder="Patient ID (e.g. patient_102)"
              placeholderTextColor="#475569"
            />
            <TextInput
              style={[styles.adminInput, { flex: 1.5 }]}
              value={assignDoctorName}
              onChangeText={setAssignDoctorName}
              placeholder="Doctor (e.g. Dr. Sarah Connor)"
              placeholderTextColor="#475569"
            />
            <TouchableOpacity
              style={styles.assignBtn}
              onPress={handleAssignDoctor}
              disabled={assigning}
            >
              {assigning ? (
                <ActivityIndicator size="small" color="#070B14" />
              ) : (
                <Text style={styles.assignBtnText}>ASSIGN</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Accounts List & Controls */}
          <Text style={[styles.sectionHeader, { marginTop: 14 }]}>
            SYSTEM ACCOUNTS ({adminAccounts.length})
          </Text>
          {loadingAdminData ? (
            <ActivityIndicator color="#00FF66" style={{ marginVertical: 12 }} />
          ) : (
            <View style={styles.accountsList}>
              {adminAccounts.map((acc) => (
                <View key={acc.id} style={styles.accountRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.accountName}>{acc.name}</Text>
                    <Text style={styles.accountSub}>
                      {acc.username} • <Text style={{ color: "#00FF66" }}>{acc.role}</Text> • {acc.department || "General"}
                    </Text>
                    {acc.must_change_password ? (
                      <Text style={styles.mustChangeTag}>Password Reset Enforced</Text>
                    ) : null}
                  </View>

                  <View style={styles.accountActions}>
                    <TouchableOpacity
                      style={styles.resetKeyBtn}
                      onPress={() => handleResetPassword(acc)}
                    >
                      <MaterialCommunityIcons name="key-change" size={13} color="#070B14" />
                      <Text style={styles.resetKeyText}>RESET PWD</Text>
                    </TouchableOpacity>

                    {acc.username !== "admin" ? (
                      <TouchableOpacity
                        style={[styles.toggleBtn, { backgroundColor: acc.is_active ? "#EF4444" : "#00FF66" }]}
                        onPress={() => handleToggleAccount(acc)}
                      >
                        <Text style={styles.toggleBtnText}>
                          {acc.is_active ? "DISABLE" : "ENABLE"}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Authorized Devices Manifest */}
          <Text style={[styles.sectionHeader, { marginTop: 16 }]}>
            AUTHORIZED PHYSICAL DEVICES ({authorizedDevices.length})
          </Text>
          <View style={styles.devicesList}>
            {authorizedDevices.map((dev) => (
              <View key={dev.id} style={styles.deviceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.devName}>{dev.device_name} ({dev.platform})</Text>
                  <Text style={styles.devCode}>{dev.device_id}</Text>
                  <Text style={styles.devTime}>Last Active: {new Date(dev.last_registered).toLocaleTimeString()}</Text>
                </View>
                <TouchableOpacity
                  style={styles.revokeBtn}
                  onPress={() => handleRevokeDevice(dev.id)}
                >
                  <Text style={styles.revokeBtnText}>REVOKE</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Gateway Connection Settings Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <MaterialCommunityIcons name="server-network" size={22} color="#00FF66" />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>GATEWAY ENDPOINT CONFIGURATION</Text>
            <Text style={styles.cardSub}>TRINETRA IoMT REST API & WebSocket endpoint</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 8 }}>
          <TouchableOpacity
            style={{ backgroundColor: "#052e16", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: "#00FF66" }}
            onPress={() => setInputUrl("http://10.76.151.60:8000")}
          >
            <Text style={{ color: "#00FF66", fontSize: 11, fontWeight: "700" }}>⚡ Wi-Fi Direct: 10.76.151.60:8000</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ backgroundColor: "#1E293B", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}
            onPress={() => setInputUrl("http://localhost:8000")}
          >
            <Text style={{ color: "#94A3B8", fontSize: 11 }}>Localhost:8000</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ backgroundColor: "#1E293B", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}
            onPress={() => setInputUrl("http://10.0.2.2:8000")}
          >
            <Text style={{ color: "#94A3B8", fontSize: 11 }}>Emulator</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.gatewayInput}
          value={inputUrl}
          onChangeText={setInputUrl}
          placeholder="http://10.76.151.60:8000"
          placeholderTextColor="#475569"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveUrl}>
            <Text style={styles.saveBtnText}>SAVE GATEWAY URL</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.testBtn}
            onPress={handleTestConnection}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator size="small" color="#00FF66" />
            ) : (
              <Text style={styles.testBtnText}>TEST PING</Text>
            )}
          </TouchableOpacity>
        </View>

        {testResult && (
          <View
            style={[
              styles.testResultBox,
              testResult.ok ? styles.testOk : styles.testFail,
            ]}
          >
            <MaterialCommunityIcons
              name={testResult.ok ? "check-circle" : "close-circle"}
              size={16}
              color={testResult.ok ? "#00FF66" : "#EF4444"}
            />
            <Text
              style={[
                styles.testResultText,
                { color: testResult.ok ? "#86EFAC" : "#FCA5A5" },
              ]}
            >
              {testResult.ok
                ? `Connected (${testResult.latency}ms latency) • ${testResult.msg}`
                : `Connection Failed: ${testResult.msg}`}
            </Text>
          </View>
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
  card: {
    backgroundColor: "#0D1527",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#F8FAFC",
    letterSpacing: 0.8,
  },
  cardSub: {
    fontSize: 9.5,
    color: "#64748B",
    marginTop: 2,
  },
  profileBox: {
    backgroundColor: "#070B14",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  profileKey: {
    fontSize: 10.5,
    color: "#94A3B8",
  },
  profileVal: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  profileValCode: {
    fontSize: 10.5,
    fontFamily: Platform.OS === "android" ? "monospace" : "Courier",
    color: "#00FF66",
    fontWeight: "bold",
  },
  roleBadge: {
    backgroundColor: "rgba(0, 255, 102, 0.15)",
    borderWidth: 1,
    borderColor: "#00FF66",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#00FF66",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "#EF4444",
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  logoutBtnText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#EF4444",
  },
  infoBox: {
    backgroundColor: "#070B14",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 8,
    padding: 12,
  },
  infoKey: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: "#94A3B8",
  },
  infoValCode: {
    fontSize: 10,
    fontFamily: Platform.OS === "android" ? "monospace" : "Courier",
    color: "#38BDF8",
    marginTop: 2,
  },
  tokenStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  dotOnline: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00FF66",
  },
  tokenStatusText: {
    fontSize: 10,
    color: "#86EFAC",
  },
  channelDesc: {
    fontSize: 9.5,
    color: "#94A3B8",
    lineHeight: 15,
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#CBD5E1",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  assignRow: {
    flexDirection: "row",
    gap: 6,
  },
  adminInput: {
    backgroundColor: "#070B14",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 6,
    paddingHorizontal: 8,
    height: 38,
    color: "#F8FAFC",
    fontSize: 10.5,
  },
  assignBtn: {
    backgroundColor: "#FACC15",
    paddingHorizontal: 12,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  assignBtnText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#070B14",
  },
  accountsList: {
    backgroundColor: "#070B14",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 8,
    padding: 8,
    gap: 8,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#15233D",
    paddingBottom: 6,
  },
  accountName: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  accountSub: {
    fontSize: 9,
    color: "#94A3B8",
  },
  mustChangeTag: {
    fontSize: 8,
    color: "#FACC15",
    fontWeight: "bold",
    marginTop: 1,
  },
  accountActions: {
    flexDirection: "row",
    gap: 6,
  },
  resetKeyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FACC15",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 3,
  },
  resetKeyText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#070B14",
  },
  toggleBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    justifyContent: "center",
  },
  toggleBtnText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#070B14",
  },
  devicesList: {
    backgroundColor: "#070B14",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#15233D",
    paddingBottom: 4,
  },
  devName: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  devCode: {
    fontSize: 8.5,
    fontFamily: Platform.OS === "android" ? "monospace" : "Courier",
    color: "#38BDF8",
  },
  devTime: {
    fontSize: 8,
    color: "#64748B",
  },
  revokeBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 1,
    borderColor: "#EF4444",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  revokeBtnText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#F87171",
  },
  gatewayInput: {
    backgroundColor: "#070B14",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    color: "#F8FAFC",
    fontSize: 12,
    marginBottom: 10,
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: "#00FF66",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#070B14",
  },
  testBtn: {
    flex: 1,
    backgroundColor: "rgba(0, 255, 102, 0.15)",
    borderWidth: 1,
    borderColor: "#00FF66",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  testBtnText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#00FF66",
  },
  testResultBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
    gap: 6,
    borderWidth: 1,
  },
  testOk: {
    backgroundColor: "rgba(0, 255, 102, 0.1)",
    borderColor: "#00FF66",
  },
  testFail: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "#EF4444",
  },
  testResultText: {
    fontSize: 10,
    flex: 1,
  },
});
