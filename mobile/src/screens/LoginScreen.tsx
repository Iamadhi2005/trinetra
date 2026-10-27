import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert as RNAlert,
  ScrollView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { login, changePassword, pingBackend, setServerUrl } from "../config/api";
import { User } from "../types";

interface LoginScreenProps {
  onLoginSuccess: (user: User, token: string) => void;
  serverUrl: string;
  onSaveServerUrl?: (url: string) => Promise<void>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  serverUrl,
  onSaveServerUrl,
}) => {
  const [username, setUsername] = useState<string>("dr.connor");
  const [password, setPassword] = useState<string>("DoctorInit2026!");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // First-login password change state
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentTempPassword, setCurrentTempPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [changingPassword, setChangingPassword] = useState<boolean>(false);

  // Gateway configuration modal state
  const [showGatewayModal, setShowGatewayModal] = useState<boolean>(false);
  const [customGatewayUrl, setCustomGatewayUrl] = useState<string>(serverUrl);
  const [testingGateway, setTestingGateway] = useState<boolean>(false);
  const [gatewayStatus, setGatewayStatus] = useState<string | null>(null);

  const handleApplyGateway = async (urlToUse?: string) => {
    const target = (urlToUse || customGatewayUrl).trim();
    if (!target) return;
    setTestingGateway(true);
    setGatewayStatus("Testing connection...");
    try {
      if (onSaveServerUrl) {
        await onSaveServerUrl(target);
      } else {
        await setServerUrl(target);
      }
      const res = await pingBackend();
      setGatewayStatus(`Connected: ${res.name || "TRINETRA Online"}`);
      setTimeout(() => {
        setShowGatewayModal(false);
        setGatewayStatus(null);
      }, 1200);
    } catch (e: any) {
      setGatewayStatus(`Error: ${e.message || "Failed to connect"}`);
    } finally {
      setTestingGateway(false);
    }
  };

  const handleLogin = async (customUser?: string, customPass?: string) => {
    const userToLogin = customUser || username;
    const passToLogin = customPass || password;

    if (!userToLogin.trim() || !passToLogin.trim()) {
      setErrorMsg("Please enter both username and password");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      const res = await login(userToLogin.trim(), passToLogin.trim());
      setLoading(false);

      if (res.must_change_password) {
        // Enforce first login password change policy!
        setCurrentUser(res.user);
        setCurrentTempPassword(passToLogin.trim());
        setShowPasswordChangeModal(true);
      } else {
        onLoginSuccess(res.user, res.access_token);
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || "Authentication failed. Check credentials or gateway connection.");
    }
  };

  const handlePasswordChangeSubmit = async () => {
    if (!newPassword || newPassword.length < 6) {
      RNAlert.alert("Password Policy", "New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      RNAlert.alert("Password Mismatch", "New password and confirmation do not match.");
      return;
    }
    if (newPassword === currentTempPassword) {
      RNAlert.alert("Security Policy", "New password cannot be the same as the temporary password.");
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(currentTempPassword, newPassword);
      setChangingPassword(false);
      setShowPasswordChangeModal(false);
      RNAlert.alert(
        "Password Updated",
        "Your password has been securely updated. You will now be redirected to your dashboard.",
        [
          {
            text: "Proceed",
            onPress: () => {
              if (currentUser) {
                onLoginSuccess({ ...currentUser, must_change_password: false }, "updated");
              }
            },
          },
        ]
      );
    } catch (err: any) {
      setChangingPassword(false);
      RNAlert.alert("Error", err.message || "Failed to update password");
    }
  };

  const rolePresets = [
    {
      title: "Doctor Connor",
      user: "dr.connor",
      role: "Doctor",
      dept: "Cardiology (ICU-A)",
      icon: "doctor",
      color: "#00FF66",
    },
    {
      title: "Doctor Radhi",
      user: "dr.radhi",
      role: "Doctor",
      dept: "Critical Care (ICU-A)",
      icon: "stethoscope",
      color: "#38BDF8",
    },
    {
      title: "Patient Smith",
      user: "pt.smith",
      role: "Patient",
      dept: "Inpatient Bed-01",
      icon: "account-heart",
      color: "#FACC15",
    },
    {
      title: "SOC Tech",
      user: "tech.batman",
      role: "Tech",
      dept: "IoMT Security",
      icon: "shield-bug",
      color: "#C084FC",
    },
    {
      title: "SOC Admin",
      user: "admin",
      role: "Admin",
      dept: "Hospital Administration",
      icon: "shield-crown",
      color: "#EF4444",
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Branding Header */}
      <View style={styles.brandBox}>
        <View style={styles.logoCircle}>
          <MaterialCommunityIcons name="shield-cross" size={44} color="#00FF66" />
        </View>
        <Text style={styles.brandTitle}>TRINETRA</Text>
        <Text style={styles.brandSubtitle}>IoMT Smart Hospital Security Console</Text>
        <View style={styles.badgeRow}>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Zero-Trust Individual Access Control</Text>
          </View>
        </View>
      </View>

      {/* Main Login Card */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>AUTHENTICATED SIGN IN</Text>
        <Text style={styles.cardSub}>
          Unique physician, patient, and security credentials are strictly audited.
        </Text>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons name="alert-circle" size={16} color="#EF4444" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>ACCOUNT USERNAME</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="account-outline" size={18} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={username}
              onChangeText={setUsername}
              placeholder="e.g. dr.connor, pt.smith, admin"
              placeholderTextColor="#475569"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>PASSWORD / TEMPORARY TOKEN</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="lock-outline" size={18} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter secure password"
              placeholderTextColor="#475569"
              secureTextEntry
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
          onPress={() => handleLogin()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#070B14" />
          ) : (
            <>
              <MaterialCommunityIcons name="login" size={20} color="#070B14" />
              <Text style={styles.loginBtnText}>SIGN IN TO SECURE TERMINAL</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Fast Quick-Switch Role Presets for Testing & Demonstration */}
      <View style={styles.presetsBox}>
        <Text style={styles.presetSectionTitle}>VERIFIED SYSTEM ACCOUNTS (ONE-TAP DEMO)</Text>
        <Text style={styles.presetSectionSub}>
          Test account-specific alert isolation across Doctors, Patients, and Tech team:
        </Text>

        <View style={styles.presetGrid}>
          {rolePresets.map((p) => (
            <TouchableOpacity
              key={p.user}
              style={[styles.presetCard, { borderColor: p.color + "40" }]}
              onPress={() => {
                setUsername(p.user);
                if (p.user.startsWith("dr.")) {
                  setPassword("DoctorInit2026!");
                } else if (p.user.startsWith("pt.")) {
                  setPassword("PatientCare2026!");
                } else if (p.user.startsWith("tech.")) {
                  setPassword("TechSec2026!");
                } else {
                  setPassword("admin123");
                }
              }}
            >
              <View style={[styles.presetIconCircle, { backgroundColor: p.color + "20" }]}>
                <MaterialCommunityIcons name={p.icon as any} size={20} color={p.color} />
              </View>
              <View style={styles.presetDetails}>
                <Text style={styles.presetTitle}>{p.title}</Text>
                <Text style={styles.presetUsername}>{p.user}</Text>
                <Text style={styles.presetDept}>{p.dept}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Mandatory Password Change Modal */}
      <Modal visible={showPasswordChangeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="shield-key-outline" size={28} color="#FACC15" />
              <View style={styles.modalTitleBlock}>
                <Text style={styles.modalTitle}>FIRST-LOGIN PASSWORD CHANGE</Text>
                <Text style={styles.modalSub}>
                  Hospital policy requires replacing your temporary password.
                </Text>
              </View>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalInfoText}>
                Account: <Text style={{ color: "#00FF66", fontWeight: "bold" }}>{currentUser?.name}</Text> ({currentUser?.username})
              </Text>
              <Text style={styles.modalInfoSub}>
                Department: {currentUser?.department || "General Clinical"}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NEW SECURE PASSWORD</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Minimum 6 characters"
                    placeholderTextColor="#475569"
                    secureTextEntry
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter password"
                    placeholderTextColor="#475569"
                    secureTextEntry
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.savePasswordBtn, changingPassword && styles.loginBtnDisabled]}
                onPress={handlePasswordChangeSubmit}
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator color="#070B14" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check-circle" size={18} color="#070B14" />
                    <Text style={styles.savePasswordBtnText}>UPDATE PASSWORD & ENTER CONSOLE</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Gateway Configuration Trigger Widget */}
      <TouchableOpacity
        style={styles.gatewayWidget}
        onPress={() => {
          setCustomGatewayUrl(serverUrl);
          setGatewayStatus(null);
          setShowGatewayModal(true);
        }}
        activeOpacity={0.75}
      >
        <View style={styles.gatewayWidgetLeft}>
          <MaterialCommunityIcons name="server-network" size={16} color="#38BDF8" />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.gatewayWidgetTitle}>GATEWAY ENDPOINT</Text>
            <Text style={styles.gatewayWidgetUrl} numberOfLines={1}>
              {serverUrl}
            </Text>
          </View>
        </View>
        <View style={styles.gatewayChangeBadge}>
          <MaterialCommunityIcons name="pencil" size={11} color="#0284C7" />
          <Text style={styles.gatewayChangeText}>CHANGE</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.securityAuditNotice}>
        TRINETRA IoMT Gateway • High-Assurance Hardware-Isolated Telemetry
      </Text>

      {/* Gateway Configuration Modal */}
      <Modal
        visible={showGatewayModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGatewayModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.gatewayModalBox}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconBox, { backgroundColor: "#0284C720" }]}>
                <MaterialCommunityIcons name="server-network" size={20} color="#38BDF8" />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.modalTitle}>GATEWAY SETTINGS</Text>
                <Text style={styles.modalSub}>Switch backend endpoint or tunnel</Text>
              </View>
              <TouchableOpacity onPress={() => setShowGatewayModal(false)}>
                <MaterialCommunityIcons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>SERVER ADDRESS</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="link-variant" size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={customGatewayUrl}
                  onChangeText={setCustomGatewayUrl}
                  placeholder="https://... or http://..."
                  placeholderTextColor="#475569"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>QUICK PRESETS</Text>
              
              <TouchableOpacity
                style={styles.presetItem}
                onPress={() => {
                  setCustomGatewayUrl("https://rare-adults-drive.loca.lt");
                  handleApplyGateway("https://rare-adults-drive.loca.lt");
                }}
              >
                <MaterialCommunityIcons name="cloud-check" size={18} color="#38BDF8" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.presetName}>Cloud Tunnel (Loca.lt)</Text>
                  <Text style={styles.presetDesc}>Works anywhere (4G/5G/Wi-Fi) • No AP isolation</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={16} color="#64748B" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetItem}
                onPress={() => {
                  setCustomGatewayUrl("http://192.168.1.78:8000");
                  handleApplyGateway("http://192.168.1.78:8000");
                }}
              >
                <MaterialCommunityIcons name="wifi" size={18} color="#10B981" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.presetName}>Home Wi-Fi LAN (192.168.1.78)</Text>
                  <Text style={styles.presetDesc}>Direct local IP (requires router AP isolation OFF)</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={16} color="#64748B" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetItem}
                onPress={() => {
                  setCustomGatewayUrl("http://10.0.2.2:8000");
                  handleApplyGateway("http://10.0.2.2:8000");
                }}
              >
                <MaterialCommunityIcons name="monitor" size={18} color="#F59E0B" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.presetName}>PC Android Emulator</Text>
                  <Text style={styles.presetDesc}>http://10.0.2.2:8000 (virtual machine only)</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={16} color="#64748B" />
              </TouchableOpacity>

              {gatewayStatus ? (
                <View
                  style={[
                    styles.statusBox,
                    gatewayStatus.startsWith("Connected")
                      ? styles.statusBoxSuccess
                      : styles.statusBoxError,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={gatewayStatus.startsWith("Connected") ? "check-circle" : "alert-circle"}
                    size={16}
                    color={gatewayStatus.startsWith("Connected") ? "#10B981" : "#EF4444"}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: gatewayStatus.startsWith("Connected") ? "#10B981" : "#EF4444" },
                    ]}
                  >
                    {gatewayStatus}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.saveGatewayBtn, testingGateway && styles.loginBtnDisabled]}
                onPress={() => handleApplyGateway()}
                disabled={testingGateway}
              >
                {testingGateway ? (
                  <ActivityIndicator color="#070B14" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check" size={18} color="#070B14" />
                    <Text style={styles.saveGatewayBtnText}>TEST & SAVE GATEWAY</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070B14",
  },
  content: {
    padding: 20,
    paddingTop: Platform.OS === "android" ? 40 : 20,
    paddingBottom: 60,
  },
  brandBox: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(0, 255, 102, 0.1)",
    borderWidth: 2,
    borderColor: "#00FF66",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#F8FAFC",
    letterSpacing: 3,
  },
  brandSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    letterSpacing: 0.5,
  },
  badgeRow: {
    marginTop: 10,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 255, 102, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 255, 102, 0.3)",
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00FF66",
  },
  statusText: {
    fontSize: 10,
    color: "#00FF66",
    fontWeight: "bold",
  },
  card: {
    backgroundColor: "#0D1527",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#F8FAFC",
    letterSpacing: 1,
  },
  cardSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 16,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "#EF4444",
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 11,
    color: "#F87171",
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#94A3B8",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#070B14",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    height: 44,
    color: "#F8FAFC",
    fontSize: 13,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00FF66",
    paddingVertical: 13,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#070B14",
    letterSpacing: 0.8,
  },
  presetsBox: {
    backgroundColor: "#0D1527",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  presetSectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  presetSectionSub: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 12,
  },
  presetGrid: {
    gap: 10,
  },
  presetCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#070B14",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    gap: 12,
  },
  presetIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  presetDetails: {
    flex: 1,
  },
  presetTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  presetUsername: {
    fontSize: 10,
    color: "#94A3B8",
    fontFamily: Platform.OS === "android" ? "monospace" : "Courier",
  },
  presetDept: {
    fontSize: 9,
    color: "#64748B",
  },
  footerNotice: {
    textAlign: "center",
    fontSize: 9,
    color: "#475569",
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#0D1527",
    borderWidth: 1,
    borderColor: "#FACC15",
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    paddingBottom: 12,
  },
  modalTitleBlock: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#F8FAFC",
  },
  modalSub: {
    fontSize: 10,
    color: "#FACC15",
    marginTop: 2,
  },
  modalBody: {
    gap: 8,
  },
  modalInfoText: {
    fontSize: 12,
    color: "#CBD5E1",
  },
  modalInfoSub: {
    fontSize: 10,
    color: "#64748B",
    marginBottom: 8,
  },
  savePasswordBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FACC15",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  savePasswordBtnText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#070B14",
    letterSpacing: 0.5,
  },
  gatewayWidget: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0D1527",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 20,
  },
  gatewayWidgetLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  gatewayWidgetTitle: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  gatewayWidgetUrl: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: "#38BDF8",
    marginTop: 1,
  },
  gatewayChangeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0284C720",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 3,
  },
  gatewayChangeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#38BDF8",
  },
  securityAuditNotice: {
    fontSize: 10,
    color: "#475569",
    textAlign: "center",
    marginTop: 10,
    letterSpacing: 0.3,
  },
  modalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  gatewayModalBox: {
    backgroundColor: "#0D1527",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 16,
    width: "100%",
  },
  presetItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#131F37",
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  presetName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F1F5F9",
  },
  presetDesc: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 1,
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 6,
    marginVertical: 8,
    gap: 6,
  },
  statusBoxSuccess: {
    backgroundColor: "#10B98115",
    borderWidth: 1,
    borderColor: "#10B98140",
  },
  statusBoxError: {
    backgroundColor: "#EF444415",
    borderWidth: 1,
    borderColor: "#EF444440",
  },
  saveGatewayBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#38BDF8",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  saveGatewayBtnText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#070B14",
    letterSpacing: 0.5,
  },
});
