import AsyncStorage from "@react-native-async-storage/async-storage";
import { Patient, AttackState, Alert, QuarantineItem } from "../types";

const SERVER_URL_KEY = "@trinetra_server_url";
const AUTH_TOKEN_KEY = "@trinetra_auth_token";
const DEFAULT_URL = "https://soft-mirrors-clean.loca.lt";

export function sanitizeUrl(url: string): string {
  if (!url) return DEFAULT_URL;
  // Strip whitespace, tabs, newlines, zero-width chars
  let clean = url.trim().replace(/[\r\n\t\s\u200B-\u200D\uFEFF]/g, "");

  // If user appended :8000 to localtunnel, strip it (localtunnel uses standard HTTPS 443)
  if (clean.includes(".loca.lt:8000")) {
    clean = clean.replace(".loca.lt:8000", ".loca.lt");
  }

  // Ensure scheme exists
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    if (clean.includes("loca.lt") || clean.includes("ngrok") || clean.includes(".app") || clean.includes(".dev")) {
      clean = `https://${clean}`;
    } else {
      clean = `http://${clean}`;
    }
  }

  // Remove trailing slashes
  clean = clean.replace(/\/+$/, "");
  return clean;
}

export async function getServerUrl(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(SERVER_URL_KEY);
    if (saved && saved.trim()) {
      return sanitizeUrl(saved);
    }
  } catch (e) {
    console.warn("Failed to read server URL from storage:", e);
  }
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
  const timeoutId = setTimeout(() => controller.abort(), 8000);

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

// ---------------- API Methods ---------------- //

export async function pingBackend(): Promise<{ name: string; status: string }> {
  return await apiRequest("/");
}

export async function login(
  username: string = "admin",
  password: string = "admin123"
): Promise<{ access_token: string }> {
  const res = await apiRequest<{ access_token: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  if (res.access_token) {
    await setAuthToken(res.access_token);
  }
  return res;
}

export async function getPatients(): Promise<Patient[]> {
  try {
    return await apiRequest<Patient[]>("/api/patients");
  } catch {
    // Fallback baseline mock list if patients endpoint requires specific auth initially
    return [
      { id: "patient_101", name: "John Doe", age: 52, status: "Normal", ward_number: "ICU-A", bed_number: "01" },
      { id: "patient_102", name: "Robert Smith", age: 61, status: "Normal", ward_number: "ICU-A", bed_number: "02" },
      { id: "patient_103", name: "Alice Johnson", age: 38, status: "Normal", ward_number: "ICU-B", bed_number: "01" },
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

export async function resolveAlert(
  alertId: number,
  notes: string = "Resolved from Trinetra Mobile Remote"
): Promise<{ message: string }> {
  return await apiRequest(`/api/alerts/${alertId}/resolve`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
}

export async function getQuarantineQueue(): Promise<QuarantineItem[]> {
  return await apiRequest<QuarantineItem[]>("/api/security/quarantine");
}
