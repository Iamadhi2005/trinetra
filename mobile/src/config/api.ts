import AsyncStorage from "@react-native-async-storage/async-storage";
import { Patient, AttackState, Alert, AlertDetail, QuarantineItem, User, NotificationLog, DeviceRegistration } from "../types";

const SERVER_URL_KEY = "@trinetra_server_url";
const AUTH_TOKEN_KEY = "@trinetra_auth_token";
const AUTH_USER_KEY = "@trinetra_auth_user";
const DEVICE_UUID_KEY = "@trinetra_device_uuid";
export const CLOUD_TUNNEL_URL = "https://rare-adults-drive.loca.lt";
export const LOCAL_WIFI_URL = "http://10.76.151.60:8000";
const DEFAULT_URL = CLOUD_TUNNEL_URL; // Public Cloud Tunnel — accessible over 4G/5G mobile data and any Wi-Fi

export function sanitizeUrl(url: string): string {
  if (!url) return DEFAULT_URL;
  let clean = url.trim().replace(/[\r\n\t\s\u200B-\u200D\uFEFF]/g, "");
  if (clean.includes(".loca.lt:8000")) {
    clean = clean.replace(".loca.lt:8000", ".loca.lt");
  }
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    if (clean.includes("loca.lt") || clean.includes("ngrok") || clean.includes(".app") || clean.includes(".dev")) {
      clean = `https://${clean}`;
    } else {
      clean = `http://${clean}`;
    }
  }
  return clean.replace(/\/+$/, "");
}

export async function getServerUrl(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(SERVER_URL_KEY);
    if (saved && saved.trim() && !saved.includes("10.0.2.2")) {
      return sanitizeUrl(saved);
    }
  } catch (e) {}
  return DEFAULT_URL;
}

export async function setServerUrl(url: string): Promise<void> {
  const sanitized = sanitizeUrl(url);
  await AsyncStorage.setItem(SERVER_URL_KEY, sanitized);
}

export async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

export async function setAuthToken(token: string | null): Promise<void> {
  if (token) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export async function getCachedUser(): Promise<User | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setCachedUser(user: User | null): Promise<void> {
  if (user) {
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    await AsyncStorage.removeItem(AUTH_USER_KEY);
  }
}

export async function getOrCreateDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_UUID_KEY);
  if (!id) {
    id = "TRN-AND-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    await AsyncStorage.setItem(DEVICE_UUID_KEY, id);
  }
  return id;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const rawBase = await getServerUrl();
  const baseUrl = sanitizeUrl(rawBase);
  const token = await getAuthToken();

  let cleanEndpoint = endpoint ? endpoint.trim() : "";
  if (!cleanEndpoint.startsWith("/")) {
    cleanEndpoint = `/${cleanEndpoint}`;
  }
  const url = cleanEndpoint === "/" ? baseUrl : `${baseUrl}${cleanEndpoint}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "bypass-tunnel-reminder": "true",
    "Bypass-Tunnel-Reminder": "true",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s — accommodates cloud tunnel latency

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      let errDetail = errText;
      try {
        const json = JSON.parse(errText);
        errDetail = json.detail || json.message || errText;
      } catch {}
      throw new Error(`[${res.status}] ${errDetail || res.statusText}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

// ----------------- Auth & Account APIs ----------------- //

export async function pingBackend(): Promise<{ name: string; status: string }> {
  return await apiRequest("/");
}

export async function login(
  username: string,
  password: string
): Promise<{ access_token: string; user: User; must_change_password: boolean }> {
  const res = await apiRequest<{ access_token: string; user: User; must_change_password: boolean }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  if (res.access_token) {
    await setAuthToken(res.access_token);
    await setCachedUser(res.user);
  }
  return res;
}

export async function logout(): Promise<void> {
  try {
    const deviceId = await getOrCreateDeviceId();
    await unregisterDeviceToken(deviceId);
  } catch {}
  await setAuthToken(null);
  await setCachedUser(null);
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
  return await apiRequest("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
}

export async function getCurrentUser(): Promise<User> {
  const user = await apiRequest<User>("/api/auth/me");
  await setCachedUser(user);
  return user;
}

// ----------------- Account-Specific Notification APIs ----------------- //

export async function registerDeviceToken(
  deviceId: string,
  fcmToken?: string,
  deviceName: string = "Android Mobile Console"
): Promise<DeviceRegistration> {
  return await apiRequest("/api/notifications/register-device", {
    method: "POST",
    body: JSON.stringify({
      device_id: deviceId,
      fcm_token: fcmToken,
      device_name: deviceName,
      platform: "android",
    }),
  });
}

export async function unregisterDeviceToken(deviceId: string): Promise<{ message: string }> {
  return await apiRequest(`/api/notifications/unregister-device?device_id=${encodeURIComponent(deviceId)}`, {
    method: "POST",
  });
}

export async function getMyAlerts(): Promise<Alert[]> {
  try {
    return await apiRequest<Alert[]>("/api/notifications/my-alerts");
  } catch (err) {
    return await getAlerts();
  }
}

export async function getNotificationLogs(): Promise<NotificationLog[]> {
  return await apiRequest<NotificationLog[]>("/api/notifications/logs");
}

export async function acknowledgeNotification(logId: number): Promise<{ message: string }> {
  return await apiRequest(`/api/notifications/ack/${logId}`, {
    method: "POST",
  });
}

export async function dispatchTestNotification(
  attackType: string = "ECG Waveform Spoofing",
  patientId: string = "patient_102",
  severity: string = "Critical"
): Promise<any> {
  return await apiRequest(
    `/api/notifications/dispatch-test?attack_type=${encodeURIComponent(attackType)}&patient_id=${encodeURIComponent(patientId)}&severity=${encodeURIComponent(severity)}`,
    { method: "POST" }
  );
}

// ----------------- Administrator Console APIs ----------------- //

export async function getAdminAccounts(): Promise<User[]> {
  return await apiRequest<User[]>("/api/admin/accounts");
}

export async function createAdminAccount(data: {
  username: string;
  name: string;
  role: string;
  department?: string;
  assigned_patient_id?: string;
  password: string;
}): Promise<User> {
  return await apiRequest("/api/admin/accounts", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function assignDoctorToPatient(patientId: string, doctorName: string): Promise<any> {
  return await apiRequest("/api/admin/assign-doctor", {
    method: "POST",
    body: JSON.stringify({ patient_id: patientId, doctor_name: doctorName }),
  });
}

export async function resetUserPassword(userId: number, tempPassword?: string): Promise<any> {
  return await apiRequest("/api/admin/reset-password", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, new_temporary_password: tempPassword }),
  });
}

export async function disableUserAccount(userId: number): Promise<any> {
  return await apiRequest(`/api/admin/disable-account/${userId}`, {
    method: "POST",
  });
}

export async function enableUserAccount(userId: number): Promise<any> {
  return await apiRequest(`/api/admin/enable-account/${userId}`, {
    method: "POST",
  });
}

export async function getAuthorizedDevices(): Promise<DeviceRegistration[]> {
  return await apiRequest<DeviceRegistration[]>("/api/admin/devices");
}

export async function revokeAuthorizedDevice(regId: number): Promise<any> {
  return await apiRequest(`/api/admin/devices/${regId}`, {
    method: "DELETE",
  });
}

// ----------------- Clinical & Simulator APIs ----------------- //

export async function getPatients(): Promise<Patient[]> {
  try {
    return await apiRequest<Patient[]>("/api/patients");
  } catch {
    return [
      { id: "patient_101", name: "John Doe", age: 52, status: "Normal", ward_number: "ICU-A", bed_number: "01", doctor_assigned: "Dr. Radhi" },
      { id: "patient_102", name: "Robert Smith", age: 61, status: "Normal", ward_number: "ICU-A", bed_number: "01", doctor_assigned: "Dr. Sarah Connor" },
      { id: "PAT-6665", name: "Babu", age: 48, status: "Normal", ward_number: "ICU-A", bed_number: "02", doctor_assigned: "Dr. Sarah Connor" },
      { id: "PAT-7850", name: "Raju", age: 54, status: "Normal", ward_number: "ICU-A", bed_number: "03", doctor_assigned: "Dr. Radhi" },
    ];
  }
}

export async function getAttackState(): Promise<AttackState> {
  return await apiRequest<AttackState>("/api/security/attack");
}

export async function triggerAttack(
  attack_mode: string,
  target_patient: string = ""
): Promise<{ message: string; state: any; details?: any }> {
  return await apiRequest("/api/security/attack", {
    method: "POST",
    body: JSON.stringify({ attack_mode, target_patient }),
  });
}

export async function disengageAll(): Promise<{ message: string; state: any }> {
  return await triggerAttack("Normal", "");
}

export async function getAlerts(): Promise<Alert[]> {
  return await apiRequest<Alert[]>("/api/alerts");
}

export async function getAlertDetail(alertId: number): Promise<AlertDetail> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Detail fetch timed out")), 5000)
  );
  return await Promise.race([
    apiRequest<AlertDetail>(`/api/alerts/${alertId}/detail`),
    timeoutPromise,
  ]);
}

export async function updateAlertStatus(
  alertId: number,
  status: string,
  notes: string = ""
): Promise<{ message: string; status: string }> {
  return await apiRequest(`/api/alerts/${alertId}/status`, {
    method: "POST",
    body: JSON.stringify({ status, notes }),
  });
}

export async function resolveAlert(
  alertId: number,
  notes: string = "Resolved from TRINETRA Mobile Remote"
): Promise<{ message: string }> {
  return await apiRequest(`/api/alerts/${alertId}/resolve`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
}

export async function getQuarantineQueue(): Promise<QuarantineItem[]> {
  return await apiRequest<QuarantineItem[]>("/api/security/quarantine");
}

