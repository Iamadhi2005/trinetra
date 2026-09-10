import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { sanitizeUrl } from "../config/api";

interface SettingsScreenProps {
  serverUrl: string;
  onSaveServerUrl: (url: string) => Promise<void>;
  onTestConnection: () => Promise<{ ok: boolean; latency: number; msg: string }>;
  onLogin: (user: string, pass: string) => Promise<{ ok: boolean; msg: string }>;
  token: string | null;
  onLogout: () => Promise<void>;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  serverUrl,
  onSaveServerUrl,
  onTestConnection,
  onLogin,
  token,
  onLogout,
}) => {
  const [inputUrl, setInputUrl] = useState(serverUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; latency: number; msg: string } | null>(null);

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginResult, setLoginResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleSave = async () => {
    const clean = sanitizeUrl(inputUrl);
    setInputUrl(clean);
    await onSaveServerUrl(clean);
    handleTest();
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await onTestConnection();
      setTestResult(res);
    } finally {
      setTesting(false);
    }
  };

  const handleLogin = async () => {
    setLoggingIn(true);
    setLoginResult(null);
    try {
      const res = await onLogin(username, password);
      setLoginResult(res);
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Gateway Configuration */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="server-network" size={18} color="#00FF66" />
          <Text style={styles.cardTitle}>TRINETRA API GATEWAY HOST</Text>
        </View>

        <Text style={styles.inputLabel}>Backend Server URL:</Text>
        <TextInput
          style={styles.textInput}
          value={inputUrl}
          onChangeText={setInputUrl}
          placeholder="http://192.168.1.X:8000"
          placeholderTextColor="#475569"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Presets */}
        <Text style={styles.presetLabel}>Quick Presets:</Text>
        <View style={styles.presetRow}>
          <TouchableOpacity
            style={[styles.presetBtn, { borderColor: "#00FF66", borderWidth: 1 }]}
            onPress={() => setInputUrl("https://soft-mirrors-clean.loca.lt")}
          >
            <Text style={[styles.presetBtnText, { color: "#00FF66" }]}>HTTPS Tunnel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.presetBtn}
            onPress={() => setInputUrl("http://10.0.2.2:8000")}
          >
            <Text style={styles.presetBtnText}>Emulator</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.presetBtn}
            onPress={() => setInputUrl("http://localhost:8000")}
          >
            <Text style={styles.presetBtnText}>Localhost</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={testing}
          >
            <Text style={styles.saveBtnText}>Save & Ping</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testBtn}
            onPress={handleTest}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator size="small" color="#00FF66" />
            ) : (
              <Text style={styles.testBtnText}>Test Ping</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Test Result Message */}
        {testResult && (
          <View
            style={[
              styles.resultBox,
              testResult.ok ? styles.resultSuccess : styles.resultError,
            ]}
          >
            <MaterialCommunityIcons
              name={testResult.ok ? "check-circle" : "close-circle"}
              size={16}
              color={testResult.ok ? "#00FF66" : "#EF4444"}
            />
            <Text
              style={[
                styles.resultText,
                { color: testResult.ok ? "#00FF66" : "#EF4444" },
              ]}
            >
              {testResult.msg} {testResult.ok ? `(${testResult.latency}ms)` : ""}
            </Text>
          </View>
        )}
      </View>

      {/* Authentication Gateway */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="account-key" size={18} color="#60A5FA" />
          <Text style={styles.cardTitle}>SOC OPERATOR AUTHENTICATION</Text>
        </View>

        <Text style={styles.cardDesc}>
          Authenticates your mobile device to view protected alerts and execute quarantine overrides.
        </Text>

        {token ? (
          <View style={styles.authenticatedBox}>
            <MaterialCommunityIcons name="shield-check" size={20} color="#00FF66" />
            <View style={{ flex: 1 }}>
              <Text style={styles.authStatusTitle}>AUTHENTICATED</Text>
              <Text style={styles.authStatusSub}>Active JWT session established</Text>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
              <Text style={styles.logoutBtnText}>Logout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.loginForm}>
            <Text style={styles.inputLabel}>Username:</Text>
            <TextInput
              style={styles.textInput}
              value={username}
              onChangeText={setUsername}
              placeholder="admin"
              placeholderTextColor="#475569"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Password:</Text>
            <TextInput
              style={styles.textInput}
              value={password}
              onChangeText={setPassword}
              placeholder="admin123"
              placeholderTextColor="#475569"
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.loginBtn}
              onPress={handleLogin}
              disabled={loggingIn}
            >
              {loggingIn ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.loginBtnText}>Sign In as SOC Operator</Text>
              )}
            </TouchableOpacity>

            {loginResult && (
              <View
                style={[
                  styles.resultBox,
                  loginResult.ok ? styles.resultSuccess : styles.resultError,
                ]}
              >
                <Text
                  style={[
                    styles.resultText,
                    { color: loginResult.ok ? "#00FF66" : "#EF4444" },
                  ]}
                >
                  {loginResult.msg}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Network Pairing Instructions */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="information-outline" size={18} color="#94A3B8" />
          <Text style={styles.cardTitle}>CONNECTING YOUR PHYSICAL PHONE</Text>
        </View>

        <Text style={styles.infoText}>
          1. Connect your phone and PC to the same Wi-Fi network.
        </Text>
        <Text style={styles.infoText}>
          2. Check your PC's IPv4 address via terminal (`ipconfig`).
        </Text>
        <Text style={styles.infoText}>
          3. Set Server URL to: <Text style={styles.codeText}>http://192.168.x.x:8000</Text>
        </Text>
        <Text style={styles.infoText}>
          4. Tap "Save & Ping" to test roundtrip communication.
        </Text>
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
    gap: 14,
  },
  card: {
    backgroundColor: "#0D1527",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#F8FAFC",
    letterSpacing: 0.5,
  },
  cardDesc: {
    fontSize: 11,
    color: "#94A3B8",
    marginBottom: 12,
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "bold",
    marginBottom: 4,
    marginTop: 6,
    textTransform: "uppercase",
  },
  textInput: {
    backgroundColor: "#070B14",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "monospace",
  },
  presetLabel: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 8,
    marginBottom: 4,
  },
  presetRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  presetBtn: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
  },
  presetBtnText: {
    fontSize: 9,
    color: "#CBD5E1",
    fontWeight: "600",
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: "#00FF66",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#000000",
    fontSize: 11,
    fontWeight: "bold",
  },
  testBtn: {
    paddingHorizontal: 16,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  testBtnText: {
    color: "#00FF66",
    fontSize: 11,
    fontWeight: "bold",
  },
  resultBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: "rgba(0, 255, 102, 0.1)",
    borderColor: "rgba(0, 255, 102, 0.3)",
  },
  resultError: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  resultText: {
    fontSize: 10,
    fontWeight: "600",
    flex: 1,
  },
  authenticatedBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 255, 102, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 102, 0.3)",
    padding: 10,
    borderRadius: 6,
    gap: 8,
  },
  authStatusTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#00FF66",
  },
  authStatusSub: {
    fontSize: 9,
    color: "#94A3B8",
  },
  logoutBtn: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  logoutBtnText: {
    color: "#EF4444",
    fontSize: 10,
    fontWeight: "bold",
  },
  loginForm: {
    gap: 4,
  },
  loginBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 10,
  },
  loginBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
  },
  infoText: {
    fontSize: 11,
    color: "#94A3B8",
    lineHeight: 18,
  },
  codeText: {
    color: "#00FF66",
    fontFamily: "monospace",
  },
});
