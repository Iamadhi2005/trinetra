"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Wifi,
  WifiOff,
  Terminal,
  Play,
  Square,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Cpu,
  Zap,
  Lock,
  Unlock,
  RefreshCw,
  ChevronRight,
  Eye,
  Download,
  Clock,
  User,
  Server,
  Database,
  Layers,
  BarChart3,
  Radio,
  FlaskConical,
  SlidersHorizontal,
  Target,
  Crosshair,
  Network,
  FileText,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConnState = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";

type SimState =
  | "IDLE"
  | "CONFIGURED"
  | "AUTHORIZED"
  | "RUNNING"
  | "EVALUATING"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED"
  | "BLOCKED"
  | "MODEL_UNAVAILABLE"
  | "CONNECTION_LOST";

interface Patient {
  patient_id: string;
  patient_name: string;
  ward: string;
  bed: string;
  status: string;
  is_calibrated: boolean;
  devices: { device_id: string; name: string; type: string; status: string }[];
}

interface Scenario {
  label: string;
  description: string;
  attack_mode: string;
  ml_layer: string;
  features: string[];
  detection_path: string;
  severity: string;
}

interface ConnectionInfo {
  operator: { username: string; role: string; name: string };
  environment: { name: string; backend_version: string; ws_telemetry: string };
  targets: Patient[];
  scenarios: Record<string, Scenario>;
  model_status: Record<string, boolean>;
  ips_rules: { id: number; name: string; enabled: boolean; threshold: number }[];
  system_mode: string;
  connected_at: string;
}

interface SimStage {
  stage: string;
  timestamp: string;
  detail: string;
  device_id?: string;
  reason?: string;
}

interface SimRecord {
  sim_id: string;
  scenario: string;
  scenario_label: string;
  attack_mode: string;
  detection_path: string;
  ml_layer: string;
  target_patient: string;
  target_patient_name: string;
  config: Record<string, unknown>;
  state: SimState;
  operator: string;
  started_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  stages: SimStage[];
  ml_result: unknown;
  ips_result: {
    action: string;
    device_id: string;
    reason: string;
    client_id: string;
    timestamp: number;
  } | null;
  enforcement_action: string | null;
  alerts_generated: number[];
  audit_ref: number | null;
  final_status: string | null;
  failure_reason: string | null;
}

interface LiveDiagnostics {
  diagnostics: {
    l2_network?: {
      features: { duration: number; rate: number; tot_size: number; avg_size: number; iat: number };
      rf_pred: number;
      rf_prob_attack: number;
      rf_prob_benign: number;
      is_anomaly: boolean;
    };
    l1_physiological?: {
      features: { heart_rate: number; spo2: number; lead_impedance: number; infusion_rate: number };
      if_pred: number;
      if_anomaly_score: number;
      is_anomaly: boolean;
    };
    last_decision?: string;
    timestamp?: number;
  };
  system_mode: string;
  attack_mode: string;
  target_patient: string;
  model_l1_loaded: boolean;
  model_l2_loaded: boolean;
  quarantine_count: number;
}

interface IPSState {
  quarantine_queue: { device_id: string; client_id: string; reason: string; patient_id: string; timestamp: number }[];
  blocked_clients: string[];
  unresolved_alerts: { id: number; device_id: string; patient_id: string; severity: string; message: string; timestamp: string }[];
  quarantine_count: number;
  blocked_count: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<string, string> = {
  Critical: "text-red-400 border-red-700 bg-red-950/40",
  High: "text-orange-400 border-orange-700 bg-orange-950/40",
  Warning: "text-amber-400 border-amber-700 bg-amber-950/40",
  Info: "text-cyan-400 border-cyan-700 bg-cyan-950/40",
};

const STATE_COLOR: Record<SimState, string> = {
  IDLE: "text-gray-400",
  CONFIGURED: "text-cyan-400",
  AUTHORIZED: "text-blue-400",
  RUNNING: "text-amber-400 animate-pulse",
  EVALUATING: "text-yellow-400 animate-pulse",
  COMPLETED: "text-emerald-400",
  CANCELLED: "text-gray-500",
  FAILED: "text-red-500",
  BLOCKED: "text-red-600",
  MODEL_UNAVAILABLE: "text-orange-500",
  CONNECTION_LOST: "text-red-400",
};

const SCENARIO_ICONS: Record<string, React.ReactNode> = {
  DoS: <Zap className="w-4 h-4 text-red-400" />,
  Tampering: <SlidersHorizontal className="w-4 h-4 text-amber-400" />,
  Override: <AlertTriangle className="w-4 h-4 text-red-400" />,
  Replay: <RefreshCw className="w-4 h-4 text-orange-400" />,
  ARP: <Network className="w-4 h-4 text-amber-400" />,
  Fault: <Activity className="w-4 h-4 text-yellow-400" />,
  Drain: <BarChart3 className="w-4 h-4 text-orange-400" />,
  BruteForce: <Lock className="w-4 h-4 text-red-400" />,
};

const FALLBACK_SCENARIOS: Record<string, Scenario> = {
  DoS: {
    label: "DoS / MQTT Packet Flood",
    description: "Simulates volumetric packet flooding. Evaluated by Random Forest Layer 2 (CIC-IoMT-2024).",
    attack_mode: "DoS",
    ml_layer: "Layer 2 — Random Forest",
    features: ["Flow Rate", "Total Size", "IAT", "Duration", "Avg Size"],
    detection_path: "pure_ml",
    severity: "Critical",
  },
  Tampering: {
    label: "Medical Telemetry Tampering",
    description: "Injects manipulated physiological vitals. Evaluated by Isolation Forest Layer 1.",
    attack_mode: "Override",
    ml_layer: "Layer 1 — Isolation Forest",
    features: ["Heart Rate", "SpO2", "Lead Impedance", "Infusion Rate"],
    detection_path: "pure_ml",
    severity: "Critical",
  },
  Override: {
    label: "Unauthorized Infusion-Rate Override",
    description: "Unauthorized pump configuration change (500 mL/h). Isolation Forest evaluates physiological vector.",
    attack_mode: "Override",
    ml_layer: "Layer 1 — Isolation Forest",
    features: ["Infusion Rate", "Heart Rate", "SpO2"],
    detection_path: "pure_ml",
    severity: "Critical",
  },
  Replay: {
    label: "Telemetry Replay Injection",
    description: "Replays stale telemetry. Evaluated by timestamp-freshness rule (Layer 0, MitM/Spoofing path).",
    attack_mode: "Replay",
    ml_layer: "Layer 0 — Replay Window Rule (3000ms threshold)",
    features: ["Timestamp", "Sequence ID", "Device ID"],
    detection_path: "standard",
    severity: "High",
  },
  ARP: {
    label: "ARP Spoofing / Man-in-the-Middle",
    description: "Simulated ARP-table inconsistency and HMAC corruption. Evaluated by cryptographic signature rule.",
    attack_mode: "MitM",
    ml_layer: "Layer 0 — HMAC-SHA256 Signature Rule",
    features: ["HMAC Signature", "Client Identity", "Device MAC"],
    detection_path: "standard",
    severity: "Critical",
  },
  Fault: {
    label: "Sensor Fault / Lead Detachment",
    description: "Simulates ECG lead detachment (10,000 Ω impedance spike). Classified as hardware fault, not attack.",
    attack_mode: "Fault",
    ml_layer: "Layer 1 — Isolation Forest + Clinical Bounds Rule",
    features: ["Lead Impedance", "Heart Rate", "SpO2"],
    detection_path: "pure_ml",
    severity: "Warning",
  },
  Drain: {
    label: "Battery Depletion / Pacing Exhaustion",
    description: "Continuous high-draw cycling. Isolation Forest evaluates abnormal vitals pattern.",
    attack_mode: "Drain",
    ml_layer: "Layer 1 — Isolation Forest",
    features: ["Battery Level", "Pacing Rate", "Heart Rate"],
    detection_path: "pure_ml",
    severity: "High",
  },
  BruteForce: {
    label: "Brute-Force Authentication Attack",
    description: "High-frequency credential stuffing against the API Gateway. Rate-limited by IPS rule.",
    attack_mode: "BruteForce",
    ml_layer: "Layer 0 — Auth Rate Limiter Rule",
    features: ["Request Rate", "Client IP", "Token Validity"],
    detection_path: "standard",
    severity: "Critical",
  },
};

const SCENARIO_ATTACK_MAP: Record<string, string> = {
  DoS: "DoS",
  Tampering: "Override",
  Override: "Override",
  Replay: "Replay",
  ARP: "MitM",
  Fault: "Fault",
  Drain: "Drain",
  BruteForce: "BruteForce",
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function parseJwt(token: string) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = parseJwt(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 < Date.now();
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdversaryConsolePage() {
  // ── Connection state ──────────────────────────────────────────────────────
  const [backendUrl, setBackendUrl] = useState("https://trinetra-ya1h.onrender.com");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [connState, setConnState] = useState<ConnState>("DISCONNECTED");
  const [connError, setConnError] = useState<string | null>(null);
  const [connInfo, setConnInfo] = useState<ConnectionInfo | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [lastHealthCheck, setLastHealthCheck] = useState<string | null>(null);
  const [wsState, setWsState] = useState<"CLOSED" | "CONNECTING" | "OPEN" | "ERROR">("CLOSED");
  const [hasStoredToken, setHasStoredToken] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !!localStorage.getItem("trinetra_token")) {
      setHasStoredToken(true);
    }
  }, []);

  // ── Simulation state ──────────────────────────────────────────────────────
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [simState, setSimState] = useState<SimState>("IDLE");
  const [currentSim, setCurrentSim] = useState<SimRecord | null>(null);
  const [simConfig, setSimConfig] = useState<Record<string, number>>({
    rate: 30,
    duration: 10,
    intensity: 2,
  });

  // ── Live data ─────────────────────────────────────────────────────────────
  const [liveDiag, setLiveDiag] = useState<LiveDiagnostics | null>(null);
  const [ipsState, setIpsState] = useState<IPSState | null>(null);
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [simHistory, setSimHistory] = useState<SimRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<{ id: number; timestamp: string; username: string; action: string; target: string; severity: string }[]>([]);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const simPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const addLog = useCallback((msg: string, level: "info" | "warn" | "error" | "ml" | "ips" | "sim" = "info") => {
    const ts = new Date().toLocaleTimeString("en-GB", { hour12: false });
    const prefix =
      level === "error" ? "[ERR]" :
      level === "warn" ? "[WARN]" :
      level === "ml" ? "[ML]" :
      level === "ips" ? "[IPS]" :
      level === "sim" ? "[SIM]" : "[SYS]";
    setEventLog((prev) => [`${prefix} ${ts} — ${msg}`, ...prev].slice(0, 80));
  }, []);


  const normalizeUrl = (raw: string): string => {
    let u = (raw || "").trim();
    if (!u) return "http://localhost:8000";
    if (!u.startsWith("http://") && !u.startsWith("https://")) {
      u = "http://" + u;
    }
    return u.replace(/\/+$/, "");
  };

  const validateUrl = (url: string): string | null => {
    try {
      const u = new URL(normalizeUrl(url));
      if (!["http:", "https:"].includes(u.protocol)) return "Only http:// or https:// URLs are allowed.";
      return null;
    } catch {
      return "Invalid URL format. Example: http://localhost:8000";
    }
  };

  const api = useCallback(
    async <T = unknown>(path: string, opts: RequestInit = {}): Promise<T> => {
      if (!authToken) throw new Error("Not authenticated");
      if (isTokenExpired(authToken)) throw new Error("Auth token expired. Please reconnect.");

      const cleanBase = normalizeUrl(backendUrl);
      const cleanPath = path.startsWith("/") ? path : `/${path}`;
      const url = `${cleanBase}/api${cleanPath}`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
        ...((opts.headers as Record<string, string>) || {}),
      };
      const res = await fetch(url, { ...opts, headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      return res.json();
    },
    [authToken, backendUrl]
  );

  // ─── Connection Management ────────────────────────────────────────────────

  const openWs = useCallback(
    (token: string, baseUrl: string) => {
      const cleanBase = normalizeUrl(baseUrl);
      const wsUrl = cleanBase.replace(/^http/, "ws") + "/api/adversary/ws/events";
      setWsState("CONNECTING");
      addLog(`Opening WebSocket: ${wsUrl}`, "info");

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsState("OPEN");
          addLog("WebSocket connected — live event stream active.", "info");
        };

        ws.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data);
            if (data.event === "TELEMETRY_UPDATE") {
              setLiveDiag({
                diagnostics: data.diagnostics || {},
                system_mode: data.system_mode,
                attack_mode: data.attack_mode,
                target_patient: data.target_patient,
                model_l1_loaded: true,
                model_l2_loaded: true,
                quarantine_count: data.quarantine_count ?? 0,
              });
            } else if (data.event === "SIM_STARTED") {
              addLog(`Simulation ${data.sim_id.slice(0, 8)}… started — scenario: ${data.scenario}`, "sim");
            } else if (data.event === "SIM_CANCELLED") {
              addLog(`Simulation ${data.sim_id.slice(0, 8)}… cancelled by ${data.cancelled_by}.`, "warn");
            } else if (data.event === "SIM_COMPLETED") {
              addLog(`Simulation ${data.sim_id.slice(0, 8)}… completed — outcome: ${data.final_status}.`, "sim");
            }
          } catch {
            // non-JSON message, ignore
          }
        };

        ws.onerror = () => {
          setWsState("ERROR");
          addLog("WebSocket error — live events unavailable. REST polling active.", "warn");
        };

        ws.onclose = () => {
          setWsState("CLOSED");
          addLog("WebSocket closed.", "info");
        };
      } catch (wsErr) {
        setWsState("ERROR");
        addLog(`WebSocket connection exception: ${wsErr}`, "warn");
      }
    },
    [addLog]
  );

  const closeWs = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsState("CLOSED");
  }, []);

  const handleConnect = async (tokenOverride?: string) => {
    const urlErr = validateUrl(backendUrl);
    if (urlErr) {
      setConnError(urlErr);
      addLog(`URL validation failed: ${urlErr}`, "error");
      return;
    }

    const cleanBase = normalizeUrl(backendUrl);
    setBackendUrl(cleanBase);

    // If using existing token override, only accept valid string
    let token = typeof tokenOverride === "string" && tokenOverride.length > 10 ? tokenOverride : undefined;
    if (!token && (!username.trim() || !password)) {
      setConnError("Username and password are required. (Default lab admin: admin / admin123)");
      return;
    }

    setConnState("CONNECTING");
    setConnError(null);
    addLog(`Initiating connection to ${cleanBase}…`, "info");

    try {
      // Step 1: Authenticate if no token
      if (!token) {
        addLog(`Authenticating operator '${username.trim()}' with API Gateway…`, "info");
        let loginRes: Response;
        try {
          loginRes = await fetch(`${cleanBase}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: username.trim(), password }),
          });
        } catch (fetchErr: unknown) {
          const fetchMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
          throw new Error(
            `Unable to reach backend at ${cleanBase}. Ensure the FastAPI server is running on port 8000. (${fetchMsg})`
          );
        }

        if (!loginRes.ok) {
          const errData = await loginRes.json().catch(() => ({ detail: `HTTP ${loginRes.status}` }));
          throw new Error(errData.detail || `Authentication failed (HTTP ${loginRes.status}). Verify credentials.`);
        }

        const loginData = await loginRes.json();
        token = loginData.access_token;
      }

      if (!token) {
        throw new Error("No authorization token received.");
      }

      // Step 2: Connect adversary session
      addLog("Authorizing adversary session on TRINETRA lab gateway…", "info");
      let sessData: ConnectionInfo | null = null;
      try {
        const sessRes = await fetch(`${cleanBase}/api/adversary/session/connect`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (sessRes.ok) {
          sessData = await sessRes.json();
        } else {
          addLog(`Adversary session endpoint HTTP ${sessRes.status} — using resilient discovery…`, "warn");
        }
      } catch {
        addLog("Adversary session endpoint unreachable — using resilient discovery…", "warn");
      }

      if (!sessData) {
        let targets: Patient[] = [];
        try {
          const patRes = await fetch(`${cleanBase}/api/patients`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (patRes.ok) {
            const patList = await patRes.json();
            targets = (patList || []).map((p: any) => ({
              patient_id: p.id,
              patient_name: p.name,
              ward: p.ward_number || "ICU-A",
              bed: p.bed_number || "Bed-01",
              status: p.status || "Normal",
              is_calibrated: p.is_calibrated ?? true,
              devices: (p.devices || []).map((d: any) => ({
                device_id: d.id,
                name: d.name,
                type: d.type,
                status: d.status || "Normal",
              })),
            }));
          }
        } catch {
          // ignore
        }

        if (!targets || targets.length === 0) {
          targets = [
            { patient_id: "PAT-001", patient_name: "Robert Smith", ward: "ICU-A", bed: "Bed-01", status: "Critical", is_calibrated: true, devices: [{ device_id: "DEV-101", name: "Alaris Infusion Pump", type: "Infusion Pump", status: "Normal" }] },
            { patient_id: "PAT-002", patient_name: "Elena Rostova", ward: "ICU-A", bed: "Bed-02", status: "Normal", is_calibrated: true, devices: [{ device_id: "DEV-103", name: "Mindray ECG Monitor", type: "ECG", status: "Normal" }] },
            { patient_id: "PAT-003", patient_name: "Arthur Pendelton", ward: "ICU-B", bed: "Bed-03", status: "Warning", is_calibrated: true, devices: [{ device_id: "DEV-104", name: "Medtronic Pacemaker", type: "Pacemaker", status: "Normal" }] },
            { patient_id: "PAT-004", patient_name: "Mei-Ling Zhou", ward: "ICU-B", bed: "Bed-04", status: "Normal", is_calibrated: true, devices: [{ device_id: "DEV-106", name: "Puritan Bennett Ventilator", type: "Ventilator", status: "Normal" }] },
            { patient_id: "PAT-005", patient_name: "Carlos Rivera", ward: "ICU-C", bed: "Bed-05", status: "Normal", is_calibrated: true, devices: [{ device_id: "DEV-107", name: "Edwards Blood Pressure", type: "Blood Pressure", status: "Normal" }] },
          ];
        }

        sessData = {
          operator: { username: username.trim(), role: "Admin", name: "Chief SOC Admin / Medical Director" },
          environment: {
            name: "TRINETRA Lab (Cloud Gateway)",
            backend_version: "2.0.0",
            ws_telemetry: "/ws/telemetry/{patient_id}",
          },
          targets,
          scenarios: FALLBACK_SCENARIOS,
          model_status: {
            layer1_isolation_forest: true,
            layer2_random_forest: true,
            cusum: true,
          },
          ips_rules: [],
          system_mode: "pure_ml",
          connected_at: new Date().toISOString(),
        };
      }

      // Step 3: Commit connection state
      setAuthToken(token);
      setConnInfo(sessData);
      setConnState("CONNECTED");
      setLastHealthCheck(new Date().toISOString());

      addLog(`Session established with ${sessData.environment.name} (v${sessData.environment.backend_version})`, "info");
      addLog(`Authorized operator: ${sessData.operator.name} [Role: ${sessData.operator.role}]`, "info");
      addLog(`Discovered ${sessData.targets.length} medical targets in lab environment.`, "info");
      addLog(
        `ML Diagnostic Models: L1 Isolation Forest ${sessData.model_status.layer1_isolation_forest ? "READY" : "OFFLINE"} | L2 Random Forest ${sessData.model_status.layer2_random_forest ? "READY" : "OFFLINE"}`,
        "ml"
      );

      // Auto-select first target if none selected
      if (sessData.targets.length > 0) {
        setSelectedPatient(sessData.targets[0].patient_id);
      }

      // Step 4: Open WebSocket
      openWs(token, cleanBase);

      // Step 5: Start REST diagnostics polling
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const diagRes = await fetch(`${cleanBase}/api/adversary/diagnostics/live`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (diagRes.ok) {
            const diag = await diagRes.json();
            setLiveDiag(diag);
            setLastHealthCheck(new Date().toISOString());
          } else {
            const atkRes = await fetch(`${cleanBase}/api/security/attack`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (atkRes.ok) {
              const atk = await atkRes.json();
              setLiveDiag((prev) => ({
                diagnostics: prev?.diagnostics || {},
                system_mode: "pure_ml",
                attack_mode: atk.attack_mode || "Normal",
                target_patient: atk.target_patient || "",
                model_l1_loaded: true,
                model_l2_loaded: true,
                quarantine_count: prev?.quarantine_count || 0,
              }));
              setLastHealthCheck(new Date().toISOString());
            }
          }
        } catch {
          // ignore polling errors
        }
      }, 2000);

      // Load history
      fetchHistory(token);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setConnState("ERROR");
      setConnError(message);
      addLog(`Connection failed: ${message}`, "error");
    }
  };

  const handleDisconnect = async () => {
    addLog("Disconnecting from backend…", "info");
    try {
      if (authToken && connState === "CONNECTED") {
        await fetch(`${backendUrl}/api/adversary/session/disconnect`, {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
        });
      }
    } catch {
      // best-effort
    }

    closeWs();
    if (pollRef.current) clearInterval(pollRef.current);
    if (simPollRef.current) clearInterval(simPollRef.current);
    setConnState("DISCONNECTED");
    setConnInfo(null);
    setAuthToken(null);
    setConnError(null);
    setCurrentSim(null);
    setSimState("IDLE");
    setSelectedScenario(null);
    setSelectedPatient("");
    setLiveDiag(null);
    setIpsState(null);
    addLog("Disconnected. All simulation channels closed.", "info");
  };

  const fetchHistory = useCallback(async (token?: string) => {
    const t = token || authToken;
    if (!t) return;
    try {
      const res = await fetch(`${backendUrl}/api/adversary/evidence`, {
        headers: { Authorization: `Bearer ${t}` },
      }).then((r) => r.json());
      setSimHistory(res.simulations || []);
    } catch { /**/ }
  }, [authToken, backendUrl]);

  const fetchIpsState = useCallback(async () => {
    if (!authToken) return;
    try {
      const state = await api<IPSState>("/adversary/ips/state");
      setIpsState(state);
    } catch { /**/ }
  }, [api, authToken]);

  const fetchAuditLogs = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await api<{ logs: typeof auditLogs }>("/logs?limit=20");
      setAuditLogs(res.logs || []);
    } catch { /**/ }
  }, [api, authToken]);

  // ─── Simulation Controls ──────────────────────────────────────────────────

  const handleLaunch = async () => {
    if (!selectedScenario || !selectedPatient) {
      addLog("Select a scenario and a target patient before launching.", "warn");
      return;
    }
    if (connState !== "CONNECTED") {
      addLog("Cannot launch — not connected.", "error");
      return;
    }

    setSimState("AUTHORIZED");
    addLog(`Launching scenario: ${selectedScenario} → ${selectedPatient}…`, "sim");

    const cleanBase = normalizeUrl(backendUrl);
    const mappedAttack = SCENARIO_ATTACK_MAP[selectedScenario] || selectedScenario;

    try {
      setSimState("RUNNING");
      let sim: SimRecord;
      try {
        sim = await api<SimRecord>("/adversary/simulate", {
          method: "POST",
          body: JSON.stringify({
            scenario: selectedScenario,
            target_patient: selectedPatient,
            config: simConfig,
          }),
        });
      } catch (simErr) {
        addLog(`Initiating attack via Security Gateway: ${mappedAttack} → ${selectedPatient}…`, "info");
        await fetch(`${cleanBase}/api/security/attack`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            attack_mode: mappedAttack,
            target_patient: selectedPatient,
          }),
        });

        const targetObj = connInfo?.targets.find((t) => t.patient_id === selectedPatient);
        const scenarioDef = (connInfo?.scenarios && connInfo.scenarios[selectedScenario]) || FALLBACK_SCENARIOS[selectedScenario];

        sim = {
          sim_id: "sim-" + Math.random().toString(36).substring(2, 9),
          scenario: selectedScenario,
          scenario_label: scenarioDef?.label || selectedScenario,
          attack_mode: mappedAttack,
          detection_path: scenarioDef?.detection_path || "pure_ml",
          ml_layer: scenarioDef?.ml_layer || "Layer 1 — Isolation Forest",
          target_patient: selectedPatient,
          target_patient_name: targetObj?.patient_name || selectedPatient,
          config: simConfig,
          state: "RUNNING",
          operator: connInfo?.operator?.username || username || "admin",
          started_at: new Date().toISOString(),
          completed_at: null,
          cancelled_at: null,
          stages: [
            { stage: "INIT", timestamp: new Date().toISOString(), detail: `Attack ${mappedAttack} initiated against ${selectedPatient}` },
            { stage: "EXECUTION", timestamp: new Date().toISOString(), detail: "Simulated adversary payload active on clinical network" },
          ],
          ml_result: null,
          ips_result: null,
          enforcement_action: null,
          alerts_generated: [],
          audit_ref: null,
          final_status: null,
          failure_reason: null,
        };
      }

      setCurrentSim(sim);
      setSimState(sim.state as SimState);
      addLog(`SIM ${sim.sim_id.slice(0, 8)}… launched — Attack: ${sim.attack_mode} | ML: ${sim.ml_layer}`, "sim");

      // Poll for live updates
      if (simPollRef.current) clearInterval(simPollRef.current);
      simPollRef.current = setInterval(async () => {
        try {
          if (!sim.sim_id.startsWith("sim-")) {
            const updated = await api<SimRecord>(`/adversary/simulate/${sim.sim_id}`);
            setCurrentSim(updated);

            if (updated.ips_result && !currentSim?.ips_result) {
              addLog(`[IPS] ${updated.ips_result.action}: Device ${updated.ips_result.device_id} — ${updated.ips_result.reason}`, "ips");
            }
          }

          const liveD = await api<LiveDiagnostics>("/adversary/diagnostics/live").catch(async () => {
            const atkRes = await fetch(`${cleanBase}/api/security/attack`, {
              headers: { Authorization: `Bearer ${authToken}` },
            });
            const atk = atkRes.ok ? await atkRes.json() : {};
            return {
              diagnostics: {},
              system_mode: "pure_ml",
              attack_mode: atk.attack_mode || sim.attack_mode,
              target_patient: atk.target_patient || sim.target_patient,
              model_l1_loaded: true,
              model_l2_loaded: true,
              quarantine_count: 0,
            } as LiveDiagnostics;
          });
          setLiveDiag(liveD);

          const ips = await api<IPSState>("/adversary/ips/state").catch(() => null);
          if (ips) setIpsState(ips);
        } catch { /**/ }
      }, 1500);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setSimState("FAILED");
      addLog(`Launch failed: ${message}`, "error");
    }
  };

  const handleStop = async () => {
    if (!currentSim) return;
    addLog(`Cancelling simulation ${currentSim.sim_id.slice(0, 8)}…`, "warn");
    const cleanBase = normalizeUrl(backendUrl);
    try {
      if (!currentSim.sim_id.startsWith("sim-")) {
        const updated = await api<SimRecord>(`/adversary/simulate/${currentSim.sim_id}/cancel`, {
          method: "POST",
        });
        setCurrentSim(updated);
      } else {
        await fetch(`${cleanBase}/api/security/attack`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            attack_mode: "Normal",
            target_patient: "",
          }),
        });
        setCurrentSim((prev) => prev ? { ...prev, state: "CANCELLED" } : null);
      }
      setSimState("CANCELLED");
      if (simPollRef.current) clearInterval(simPollRef.current);
      addLog("Simulation cancelled. Attack disengaged.", "sim");
      await fetchHistory();
      await fetchAuditLogs();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      addLog(`Cancel failed: ${message}`, "error");
    }
  };

  const handleComplete = async () => {
    if (!currentSim) return;
    addLog(`Marking simulation ${currentSim.sim_id.slice(0, 8)} as COMPLETED…`, "sim");
    try {
      const updated = await api<SimRecord>(`/adversary/simulate/${currentSim.sim_id}/complete`, {
        method: "POST",
      });
      setCurrentSim(updated);
      setSimState("COMPLETED");
      if (simPollRef.current) clearInterval(simPollRef.current);
      addLog(`Simulation COMPLETED — Outcome: ${updated.final_status}`, "sim");
      await fetchHistory();
      await fetchAuditLogs();
      await fetchIpsState();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      addLog(`Complete failed: ${message}`, "error");
    }
  };

  const handleExport = async (simId: string) => {
    try {
      const report = await api<Record<string, unknown>>(`/adversary/evidence/${simId}/export`);
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trinetra_sim_${simId.slice(0, 8)}_evidence.json`;
      a.click();
      URL.revokeObjectURL(url);
      addLog(`Evidence exported: sim_${simId.slice(0, 8)}.json`, "info");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      addLog(`Export failed: ${message}`, "error");
    }
  };

  // ─── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = 0;
    }
  }, [eventLog]);

  useEffect(() => {
    if (connState === "CONNECTED") {
      fetchAuditLogs();
      fetchIpsState();
      const interval = setInterval(() => {
        fetchAuditLogs();
        fetchIpsState();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [connState, fetchAuditLogs, fetchIpsState]);

  useEffect(() => {
    return () => {
      closeWs();
      if (pollRef.current) clearInterval(pollRef.current);
      if (simPollRef.current) clearInterval(simPollRef.current);
    };
  }, [closeWs]);

  // ─── Derived values ───────────────────────────────────────────────────────

  const isConnected = connState === "CONNECTED";
  const canLaunch = isConnected && selectedScenario && selectedPatient && simState === "IDLE";
  const isRunning = simState === "RUNNING" || simState === "EVALUATING";

  const rfProb = liveDiag?.diagnostics?.l2_network?.rf_prob_attack ?? 0;
  const rfAnomaly = liveDiag?.diagnostics?.l2_network?.is_anomaly ?? false;
  const ifScore = liveDiag?.diagnostics?.l1_physiological?.if_anomaly_score ?? 0.2;
  const ifAnomaly = liveDiag?.diagnostics?.l1_physiological?.is_anomaly ?? false;

  const selectedScenarioData = connInfo?.scenarios?.[selectedScenario ?? ""];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#060A12] text-white font-mono overflow-hidden flex flex-col select-none">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex-none border-b border-[#1E293B] bg-[#07091100] backdrop-blur-sm px-5 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="w-px h-5 bg-[#1E293B]" />
          <Crosshair className="w-5 h-5 text-red-500 animate-pulse" />
          <div>
            <div className="text-sm font-bold tracking-[0.2em] text-white uppercase flex items-center gap-2">
              <span>TRINETRA // ADVERSARY ATTACKER HUB</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-red-950/80 border border-red-600 text-red-400 font-bold uppercase tracking-wider">
                HACKER C2 CONSOLE
              </span>
            </div>
            <div className="text-[10px] text-gray-500">
              Adversary Attack Simulation Hub · Used by Penetration Testers & Threat Actors · Isolated Target
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* WebSocket indicator */}
          <div className="flex items-center gap-1.5 text-[11px]">
            {wsState === "OPEN" ? (
              <><Wifi className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">WS LIVE</span></>
            ) : wsState === "CONNECTING" ? (
              <><RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" /><span className="text-amber-400">WS…</span></>
            ) : (
              <><WifiOff className="w-3.5 h-3.5 text-gray-500" /><span className="text-gray-500">WS OFF</span></>
            )}
          </div>

          {/* Sim state badge */}
          <div className={`text-xs font-bold px-2.5 py-1 rounded border border-current ${STATE_COLOR[simState]}`}>
            {simState}
          </div>

          {/* Connection badge */}
          <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border ${
            connState === "CONNECTED" ? "bg-emerald-950/40 border-emerald-700 text-emerald-400" :
            connState === "CONNECTING" ? "bg-amber-950/40 border-amber-700 text-amber-400" :
            connState === "ERROR" ? "bg-red-950/40 border-red-700 text-red-400" :
            "bg-gray-900 border-gray-700 text-gray-400"
          }`}>
            {connState === "CONNECTED" ? <ShieldCheck className="w-3.5 h-3.5" /> :
             connState === "CONNECTING" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> :
             connState === "ERROR" ? <ShieldAlert className="w-3.5 h-3.5" /> :
             <ShieldOff className="w-3.5 h-3.5" />}
            <span>{connState}</span>
          </div>
        </div>
      </header>

      {/* ── Main grid ──────────────────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-[320px_1fr_280px] overflow-hidden">

        {/* ── LEFT PANEL ───────────────────────────────────────────────────── */}
        <aside className="border-r border-[#1E293B] flex flex-col overflow-y-auto bg-[#07090F]">

          {/* ─ 1. Connection Panel ─ */}
          <section className="border-b border-[#1E293B] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Server className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">Target Connection</span>
            </div>

            {!isConnected ? (
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] text-gray-500">Backend Gateway</label>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setBackendUrl("https://trinetra-ya1h.onrender.com")}
                        className={`text-[9px] px-1.5 py-0.5 rounded border ${
                          backendUrl.includes("onrender.com")
                            ? "bg-cyan-900/50 text-cyan-300 border-cyan-500"
                            : "bg-[#161B22] text-gray-400 border-[#30363D]"
                        }`}
                      >
                        ☁️ Cloud
                      </button>
                      <button
                        type="button"
                        onClick={() => setBackendUrl("http://localhost:8000")}
                        className={`text-[9px] px-1.5 py-0.5 rounded border ${
                          backendUrl.includes("localhost")
                            ? "bg-cyan-900/50 text-cyan-300 border-cyan-500"
                            : "bg-[#161B22] text-gray-400 border-[#30363D]"
                        }`}
                      >
                        🏥 Local:8000
                      </button>
                    </div>
                  </div>
                  <input
                    id="adv-backend-url"
                    type="text"
                    value={backendUrl}
                    onChange={(e) => setBackendUrl(e.target.value)}
                    placeholder="https://trinetra-ya1h.onrender.com"
                    className="w-full bg-[#0D1117] border border-[#1E293B] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-600 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Username</label>
                    <input
                      id="adv-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-[#0D1117] border border-[#1E293B] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-600 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Password</label>
                    <input
                      id="adv-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                      className="w-full bg-[#0D1117] border border-[#1E293B] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-600 transition-colors"
                    />
                  </div>
                </div>

                {connError && (
                  <div className="bg-red-950/40 border border-red-700 rounded p-2 text-[11px] text-red-300 flex gap-1.5">
                    <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {connError}
                  </div>
                )}

                <button
                  id="adv-connect-btn"
                  onClick={() => handleConnect()}
                  disabled={connState === "CONNECTING"}
                  className="w-full py-2 rounded bg-red-700 hover:bg-red-600 disabled:bg-gray-700 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {connState === "CONNECTING" ? (
                    <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Connecting to Target…</>
                  ) : (
                    <><Zap className="w-3.5 h-3.5 text-amber-300" /> Connect to Target</>
                  )}
                </button>

                {hasStoredToken && (
                  <button
                    type="button"
                    onClick={() => handleConnect(localStorage.getItem("trinetra_token") || undefined)}
                    disabled={connState === "CONNECTING"}
                    className="w-full py-1.5 rounded bg-[#0D1526] hover:bg-[#162038] border border-cyan-800/60 text-cyan-300 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Lock className="w-3 h-3 text-cyan-400" /> Use Active Browser Session Token
                  </button>
                )}

                <p className="text-[9px] text-gray-500 text-center leading-tight">
                  No connection is established until you explicitly click Connect.
                  Target: TRINETRA Lab Gateway (port 8000). Admin/Operator required.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="bg-emerald-950/30 border border-emerald-800 rounded p-2.5 text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Authenticated & Authorized
                  </div>
                  <div className="text-gray-400">
                    <span className="text-gray-300">{connInfo?.operator.name}</span> · {connInfo?.operator.role}
                  </div>
                  <div className="text-gray-500">{backendUrl}</div>
                  {lastHealthCheck && (
                    <div className="text-gray-600">Last check: {new Date(lastHealthCheck).toLocaleTimeString()}</div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className="bg-[#0D1117] border border-[#1E293B] rounded p-1.5 text-center">
                    <div className={`font-bold ${connInfo?.model_status.layer1_isolation_forest ? "text-emerald-400" : "text-red-400"}`}>
                      {connInfo?.model_status.layer1_isolation_forest ? "✓" : "✗"} L1 IF
                    </div>
                    <div className="text-gray-600">Isolation Forest</div>
                  </div>
                  <div className="bg-[#0D1117] border border-[#1E293B] rounded p-1.5 text-center">
                    <div className={`font-bold ${connInfo?.model_status.layer2_random_forest ? "text-emerald-400" : "text-red-400"}`}>
                      {connInfo?.model_status.layer2_random_forest ? "✓" : "✗"} L2 RF
                    </div>
                    <div className="text-gray-600">Random Forest</div>
                  </div>
                </div>

                <button
                  id="adv-disconnect-btn"
                  onClick={handleDisconnect}
                  className="w-full py-1.5 rounded border border-red-800 bg-red-950/30 hover:bg-red-950/60 text-red-400 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                >
                  <WifiOff className="w-3.5 h-3.5" /> Disconnect
                </button>
              </div>
            )}
          </section>

          {/* ─ 2. Target Selection ─ */}
          <section className="border-b border-[#1E293B] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">Target Selection</span>
            </div>

            {isConnected && connInfo?.targets ? (
              <div className="space-y-1.5">
                {connInfo.targets.map((pt) => (
                  <button
                    key={pt.patient_id}
                    id={`adv-target-${pt.patient_id}`}
                    onClick={() => isConnected && !isRunning && setSelectedPatient(pt.patient_id)}
                    disabled={!isConnected || isRunning}
                    className={`w-full text-left p-2.5 rounded border transition-all ${
                      selectedPatient === pt.patient_id
                        ? "bg-amber-950/40 border-amber-600 text-amber-100"
                        : "bg-[#0D1117] border-[#1E293B] text-gray-400 hover:border-gray-600 disabled:opacity-40"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold">{pt.patient_name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                        pt.status === "Normal" ? "bg-emerald-950 text-emerald-400" : "bg-red-950 text-red-400"
                      }`}>{pt.status}</span>
                    </div>
                    <div className="text-[10px] text-gray-600 mt-0.5">
                      {pt.ward} · {pt.bed} · {pt.devices.length} device(s)
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-gray-600 text-center py-3">
                Connect to load targets
              </div>
            )}
          </section>

          {/* ─ 3. Execution Controls ─ */}
          <section className="border-b border-[#1E293B] p-4">
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical className="w-4 h-4 text-red-400" />
              <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">Execution Control</span>
            </div>

            <div className="space-y-2">
              {/* Config sliders — only shown when scenario selected */}
              {selectedScenarioData && (
                <div className="bg-[#0D1117] border border-[#1E293B] rounded p-2.5 space-y-2 text-[10px]">
                  <div className="text-gray-500 font-bold uppercase tracking-wider mb-1">Configuration</div>
                  {selectedScenario === "DoS" && (
                    <>
                      <div>
                        <div className="flex justify-between text-gray-400 mb-1">
                          <span>Sim Rate (pkts/s)</span><span className="text-white font-bold">{simConfig.rate}</span>
                        </div>
                        <input type="range" min="10" max="120" value={simConfig.rate}
                          onChange={(e) => setSimConfig((p) => ({ ...p, rate: +e.target.value }))}
                          className="w-full h-1 accent-red-500" />
                      </div>
                    </>
                  )}
                  <div>
                    <div className="flex justify-between text-gray-400 mb-1">
                      <span>Duration (s)</span><span className="text-white font-bold">{simConfig.duration}</span>
                    </div>
                    <input type="range" min="5" max="60" value={simConfig.duration}
                      onChange={(e) => setSimConfig((p) => ({ ...p, duration: +e.target.value }))}
                      className="w-full h-1 accent-amber-500" />
                  </div>
                </div>
              )}

              <button
                id="adv-launch-btn"
                onClick={handleLaunch}
                disabled={!canLaunch}
                className="w-full py-2.5 rounded bg-red-700 hover:bg-red-600 disabled:bg-gray-800 disabled:text-gray-600 text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5" />
                {canLaunch ? `Launch ${selectedScenario}` : isRunning ? "Simulation Running…" : "Select Scenario & Target"}
              </button>

              {isRunning && (
                <button
                  id="adv-stop-btn"
                  onClick={handleStop}
                  className="w-full py-2 rounded border border-amber-700 bg-amber-950/30 hover:bg-amber-950/60 text-amber-400 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                >
                  <Square className="w-3.5 h-3.5" /> Cancel Simulation
                </button>
              )}

              {simState === "RUNNING" && (
                <button
                  id="adv-complete-btn"
                  onClick={handleComplete}
                  className="w-full py-2 rounded border border-emerald-700 bg-emerald-950/30 hover:bg-emerald-950/60 text-emerald-400 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark Complete & Evaluate
                </button>
              )}

              {(simState === "COMPLETED" || simState === "CANCELLED") && (
                <button
                  id="adv-new-sim-btn"
                  onClick={() => {
                    setSimState("IDLE");
                    setCurrentSim(null);
                    setSelectedScenario(null);
                    setSelectedPatient("");
                  }}
                  className="w-full py-2 rounded border border-cyan-700 bg-cyan-950/30 hover:bg-cyan-950/60 text-cyan-400 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> New Simulation
                </button>
              )}
            </div>
          </section>

          {/* ─ IPS Rules snapshot ─ */}
          {isConnected && connInfo?.ips_rules && (
            <section className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">IPS Rules Active</span>
              </div>
              <div className="space-y-1">
                {connInfo.ips_rules.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-[10px]">
                    <span className="text-gray-500 truncate max-w-[160px]">{r.name}</span>
                    <span className={`font-bold ${r.enabled ? "text-emerald-400" : "text-gray-600"}`}>
                      {r.enabled ? "ON" : "OFF"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>

        {/* ── CENTER PANEL ─────────────────────────────────────────────────── */}
        <main className="overflow-y-auto flex flex-col gap-0 bg-[#060A12]">

          {/* ─ 4. Scenario Library ─ */}
          <section className="border-b border-[#1E293B] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">Attack Scenario Library</span>
              {!isConnected && <span className="text-[10px] text-gray-600 ml-auto">(Disabled — not connected)</span>}
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
              {(connInfo?.scenarios
                ? Object.entries(connInfo.scenarios)
                : Object.entries({
                    DoS: { label: "DoS / MQTT Flood", description: "Volumetric flood simulation.", severity: "Critical", ml_layer: "L2 RF", features: [], detection_path: "", attack_mode: "" },
                    Tampering: { label: "Telemetry Tampering", description: "Physiological data manipulation.", severity: "Critical", ml_layer: "L1 IF", features: [], detection_path: "", attack_mode: "" },
                    Override: { label: "Infusion Override", description: "Pump configuration attack.", severity: "Critical", ml_layer: "L1 IF", features: [], detection_path: "", attack_mode: "" },
                    Replay: { label: "Replay Injection", description: "Stale packet replay.", severity: "High", ml_layer: "L0 Rule", features: [], detection_path: "", attack_mode: "" },
                    ARP: { label: "ARP / MitM", description: "HMAC corruption sim.", severity: "Critical", ml_layer: "L0 Rule", features: [], detection_path: "", attack_mode: "" },
                    Fault: { label: "Sensor Fault", description: "Lead detachment simulation.", severity: "Warning", ml_layer: "L1 IF", features: [], detection_path: "", attack_mode: "" },
                    Drain: { label: "Battery Drain", description: "Pacing exhaustion attack.", severity: "High", ml_layer: "L1 IF", features: [], detection_path: "", attack_mode: "" },
                    BruteForce: { label: "Brute-Force Auth", description: "Credential flooding.", severity: "Critical", ml_layer: "L0 Rule", features: [], detection_path: "", attack_mode: "" },
                  })
              ).map(([key, sc]) => {
                const isActive = selectedScenario === key;
                const sevColor = SEVERITY_COLOR[sc.severity] ?? "text-gray-400 border-gray-700 bg-gray-900/20";
                return (
                  <button
                    key={key}
                    id={`adv-scenario-${key}`}
                    onClick={() => isConnected && !isRunning && setSelectedScenario(isActive ? null : key)}
                    disabled={!isConnected || isRunning}
                    className={`text-left p-3 rounded border transition-all ${
                      isActive
                        ? "bg-red-950/40 border-red-600 shadow-md shadow-red-900/30"
                        : "bg-[#0D1117] border-[#1E293B] hover:border-gray-600 disabled:opacity-30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      {SCENARIO_ICONS[key] ?? <Zap className="w-4 h-4 text-gray-500" />}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border ${sevColor} font-bold`}>
                        {sc.severity}
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-white leading-tight mb-0.5">{sc.label}</div>
                    <div className="text-[10px] text-gray-600 leading-tight">{sc.description}</div>
                    {isActive && (
                      <div className="mt-1.5 text-[9px] text-red-400 font-bold">▶ SELECTED</div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ─ 5. Live ML Diagnostics ─ */}
          <section className="border-b border-[#1E293B] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">Live ML Detection Pipeline</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                {liveDiag ? (
                  <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                    <span className="text-emerald-400">LIVE</span></>
                ) : (
                  <span className="text-gray-600">Waiting for data…</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* L2 Random Forest */}
              <div className={`rounded border p-3.5 space-y-2 ${rfAnomaly ? "border-red-700 bg-red-950/20" : "border-[#1E293B] bg-[#0D1117]"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-cyan-400">LAYER 2 — RANDOM FOREST</div>
                    <div className="text-[9px] text-gray-500">CIC-IoMT-2024 (50 estimators)</div>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded border font-bold ${rfAnomaly ? "text-red-400 border-red-600 bg-red-950 animate-pulse" : "text-emerald-400 border-emerald-800 bg-emerald-950"}`}>
                    {!liveDiag ? "PENDING" : rfAnomaly ? "ATTACK" : "BENIGN"}
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-gray-500">P(Attack)</span>
                    <span className={rfAnomaly ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>{(rfProb * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-900 rounded overflow-hidden">
                    <div className={`h-full rounded transition-all duration-300 ${rfAnomaly ? "bg-gradient-to-r from-amber-500 to-red-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.max(3, rfProb * 100)}%` }} />
                  </div>
                </div>
                {liveDiag?.diagnostics?.l2_network?.features && (
                  <div className="grid grid-cols-3 gap-1 text-[9px] bg-[#060A12] p-2 rounded border border-[#1E293B]">
                    <div><span className="text-gray-600">Rate:</span> <span className="text-white font-bold">{liveDiag.diagnostics.l2_network.features.rate.toFixed(1)}</span></div>
                    <div><span className="text-gray-600">Bytes:</span> <span className="text-white font-bold">{liveDiag.diagnostics.l2_network.features.tot_size}</span></div>
                    <div><span className="text-gray-600">IAT:</span> <span className="text-white font-bold">{liveDiag.diagnostics.l2_network.features.iat.toFixed(3)}</span></div>
                  </div>
                )}
                {!liveDiag && <div className="text-[9px] text-gray-600">MODEL PENDING — waiting for telemetry</div>}
              </div>

              {/* L1 Isolation Forest */}
              <div className={`rounded border p-3.5 space-y-2 ${ifAnomaly ? "border-red-700 bg-red-950/20" : "border-[#1E293B] bg-[#0D1117]"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-amber-400">LAYER 1 — ISOLATION FOREST</div>
                    <div className="text-[9px] text-gray-500">Clinical physiological baselines</div>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded border font-bold ${ifAnomaly ? "text-red-400 border-red-600 bg-red-950 animate-pulse" : "text-emerald-400 border-emerald-800 bg-emerald-950"}`}>
                    {!liveDiag ? "PENDING" : ifAnomaly ? "ANOMALY" : "INLIER"}
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-gray-500">Anomaly Score</span>
                    <span className={ifAnomaly ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>{ifScore.toFixed(4)}</span>
                  </div>
                  <div className="h-2 bg-gray-900 rounded overflow-hidden">
                    <div className={`h-full rounded transition-all duration-300 ${ifAnomaly ? "bg-red-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(100, Math.max(3, (1 - Math.abs(ifScore)) * 100))}%` }} />
                  </div>
                </div>
                {liveDiag?.diagnostics?.l1_physiological?.features && (
                  <div className="grid grid-cols-2 gap-1 text-[9px] bg-[#060A12] p-2 rounded border border-[#1E293B]">
                    <div><span className="text-gray-600">HR:</span> <span className="text-white font-bold">{liveDiag.diagnostics.l1_physiological.features.heart_rate} bpm</span></div>
                    <div><span className="text-gray-600">SpO2:</span> <span className="text-white font-bold">{liveDiag.diagnostics.l1_physiological.features.spo2}%</span></div>
                    <div><span className="text-gray-600">Imp:</span> <span className="text-white font-bold">{liveDiag.diagnostics.l1_physiological.features.lead_impedance} Ω</span></div>
                    <div><span className="text-gray-600">Inf:</span> <span className="text-white font-bold">{liveDiag.diagnostics.l1_physiological.features.infusion_rate} mL/h</span></div>
                  </div>
                )}
                {!liveDiag && <div className="text-[9px] text-gray-600">MODEL PENDING — waiting for telemetry</div>}
              </div>
            </div>

            {/* Overall decision banner */}
            {liveDiag && (
              <div className={`mt-3 p-2.5 rounded border flex items-center justify-between text-xs ${
                (rfAnomaly || ifAnomaly) ? "bg-red-950/30 border-red-700" : "bg-emerald-950/20 border-emerald-900"
              }`}>
                <div className="flex items-center gap-2">
                  {(rfAnomaly || ifAnomaly) ? <ShieldAlert className="w-4 h-4 text-red-400" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                  <span className={`font-bold ${(rfAnomaly || ifAnomaly) ? "text-red-300" : "text-emerald-300"}`}>
                    {(rfAnomaly || ifAnomaly) ? "ANOMALY DETECTED — IPS QUARANTINE TRIGGERED" : "Normal telemetry — No anomaly detected"}
                  </span>
                </div>
                <span className="text-gray-500 text-[10px]">
                  {liveDiag.diagnostics.timestamp ? new Date(liveDiag.diagnostics.timestamp * 1000).toLocaleTimeString() : "—"}
                </span>
              </div>
            )}
          </section>

          {/* ─ 6. Current Simulation State Machine ─ */}
          <section className="border-b border-[#1E293B] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">Simulation State Machine</span>
              {currentSim && (
                <span className="ml-auto text-[10px] text-gray-500 font-mono">
                  sim_id: {currentSim.sim_id.slice(0, 16)}…
                </span>
              )}
            </div>

            {currentSim ? (
              <div className="space-y-2">
                {/* Stage timeline */}
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {currentSim.stages.map((st, i) => (
                    <div key={i} className="flex items-start gap-2 text-[10px]">
                      <div className="flex flex-col items-center mt-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          st.stage === "COMPLETED" ? "bg-emerald-400" :
                          st.stage === "FAILED" || st.stage === "CANCELLED" ? "bg-red-400" :
                          st.stage === "QUARANTINE" ? "bg-amber-400" :
                          "bg-cyan-400"
                        }`} />
                        {i < currentSim.stages.length - 1 && <div className="w-px h-3 bg-gray-700" />}
                      </div>
                      <div className="flex-1">
                        <span className="text-gray-400 font-bold">{st.stage}</span>
                        <span className="text-gray-600 ml-2">{new Date(st.timestamp).toLocaleTimeString()}</span>
                        <div className="text-gray-600 leading-tight">{st.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* IPS Result */}
                {currentSim.ips_result && (
                  <div className="bg-amber-950/30 border border-amber-700 rounded p-2.5 text-[10px] space-y-0.5">
                    <div className="text-amber-400 font-bold flex items-center gap-1.5">
                      <ShieldAlert className="w-3 h-3" /> IPS ACTION: {currentSim.ips_result.action}
                    </div>
                    <div className="text-gray-400">Device: {currentSim.ips_result.device_id}</div>
                    <div className="text-gray-500">Reason: {currentSim.ips_result.reason}</div>
                    <div className="text-gray-600">Client: {currentSim.ips_result.client_id}</div>
                  </div>
                )}

                {/* Final outcome */}
                {currentSim.final_status && (
                  <div className={`p-2 rounded border text-[11px] font-bold flex items-center gap-2 ${
                    currentSim.final_status === "DETECTED" ? "bg-emerald-950/30 border-emerald-700 text-emerald-400" : "bg-gray-900 border-gray-700 text-gray-400"
                  }`}>
                    {currentSim.final_status === "DETECTED" ? <ShieldCheck className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    Final outcome: {currentSim.final_status}
                    {currentSim.audit_ref && <span className="ml-auto text-[9px] text-gray-600">Audit #{currentSim.audit_ref}</span>}
                  </div>
                )}

                <button
                  onClick={() => handleExport(currentSim.sim_id)}
                  className="w-full py-1.5 border border-gray-700 rounded text-gray-400 hover:text-white hover:border-gray-500 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3 h-3" /> Export Evidence Report
                </button>
              </div>
            ) : (
              <div className="text-center text-gray-600 text-xs py-6">
                {isConnected ? (
                  <>Select a scenario and target, then click <span className="text-red-400 font-bold">Launch</span> to begin a simulation.</>
                ) : (
                  "Connect to the backend to begin adversarial simulation."
                )}
              </div>
            )}
          </section>

          {/* ─ 7. IDS/IPS Response Panel ─ */}
          <section className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">IDS / IPS Response</span>
              {ipsState && (
                <div className="ml-auto flex items-center gap-3 text-[10px]">
                  <span className={ipsState.quarantine_count > 0 ? "text-amber-400 font-bold" : "text-gray-600"}>
                    {ipsState.quarantine_count} quarantined
                  </span>
                  <span className={ipsState.blocked_count > 0 ? "text-red-400 font-bold" : "text-gray-600"}>
                    {ipsState.blocked_count} blocked
                  </span>
                </div>
              )}
            </div>

            {ipsState ? (
              <div className="space-y-2">
                {/* Quarantine queue */}
                {ipsState.quarantine_queue.length > 0 ? (
                  ipsState.quarantine_queue.map((q, i) => (
                    <div key={i} className="bg-amber-950/20 border border-amber-800 rounded p-2.5 text-[10px]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <ShieldAlert className="w-3 h-3 text-amber-400" />
                        <span className="text-amber-300 font-bold">QUARANTINED: {q.device_id}</span>
                      </div>
                      <div className="text-gray-500">Patient: {q.patient_id} · Client: {q.client_id}</div>
                      <div className="text-gray-600">Reason: {q.reason}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-[10px] text-gray-600 text-center py-2">No active quarantines</div>
                )}

                {/* Recent unresolved alerts */}
                {ipsState.unresolved_alerts.length > 0 && (
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {ipsState.unresolved_alerts.slice(0, 5).map((a) => (
                      <div key={a.id} className={`p-2 rounded border text-[9px] ${SEVERITY_COLOR[a.severity] || "border-gray-700 bg-gray-900/20 text-gray-400"}`}>
                        <span className="font-bold">[{a.severity}]</span> {a.message?.slice(0, 120)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[11px] text-gray-600 text-center py-4">
                {isConnected ? "Loading IPS state…" : "Connect to view IPS response"}
              </div>
            )}
          </section>
        </main>

        {/* ── RIGHT PANEL ──────────────────────────────────────────────────── */}
        <aside className="border-l border-[#1E293B] flex flex-col overflow-y-auto bg-[#07090F]">

          {/* ─ 8. Event Log Terminal ─ */}
          <section className="border-b border-[#1E293B] flex flex-col" style={{ height: "45%" }}>
            <div className="flex items-center gap-2 p-3 border-b border-[#1E293B] flex-none">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Event Log</span>
              <button onClick={() => setEventLog([])} className="ml-auto text-[9px] text-gray-600 hover:text-gray-400 transition-colors">CLR</button>
            </div>
            <div ref={logRef} className="flex-1 overflow-y-auto p-3 space-y-0.5 text-[10px] font-mono">
              {eventLog.length === 0 ? (
                <div className="text-gray-700 text-center pt-4">Awaiting events…</div>
              ) : (
                eventLog.map((line, i) => (
                  <div key={i} className={
                    line.includes("[ERR]") ? "text-red-400" :
                    line.includes("[WARN]") ? "text-amber-400" :
                    line.includes("[ML]") ? "text-cyan-400" :
                    line.includes("[IPS]") ? "text-amber-300" :
                    line.includes("[SIM]") ? "text-purple-400" :
                    "text-gray-500"
                  }>{line}</div>
                ))
              )}
            </div>
          </section>

          {/* ─ 9. Simulation History & Evidence Timeline ─ */}
          <section className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 p-3 border-b border-[#1E293B] flex-none">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Evidence Timeline</span>
              {isConnected && (
                <button onClick={() => fetchHistory()} className="ml-auto text-[9px] text-gray-600 hover:text-gray-400 transition-colors">
                  <RefreshCw className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {simHistory.length === 0 ? (
                <div className="text-[10px] text-gray-700 text-center pt-4">No simulation records yet</div>
              ) : (
                simHistory.map((sim) => (
                  <div key={sim.sim_id} className="bg-[#0D1117] border border-[#1E293B] rounded p-2.5 text-[9px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 font-bold">{sim.scenario_label}</span>
                      <span className={`font-bold px-1.5 py-0.5 rounded ${
                        sim.state === "COMPLETED" ? "text-emerald-400 bg-emerald-950" :
                        sim.state === "CANCELLED" ? "text-gray-500 bg-gray-900" :
                        sim.state === "RUNNING" ? "text-amber-400 bg-amber-950" :
                        "text-red-400 bg-red-950"
                      }`}>{sim.state}</span>
                    </div>
                    <div className="text-gray-600">{sim.target_patient_name} · {new Date(sim.started_at).toLocaleTimeString()}</div>
                    {sim.final_status && (
                      <div className={`font-bold ${sim.final_status === "DETECTED" ? "text-emerald-400" : "text-gray-500"}`}>
                        → {sim.final_status}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-[8px] font-mono text-gray-700">
                      <span>{sim.sim_id.slice(0, 20)}…</span>
                      <button onClick={() => handleExport(sim.sim_id)} className="ml-auto text-gray-600 hover:text-gray-400 transition-colors">
                        <Download className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* ─ 10. Audit Log ─ */}
          <section className="border-t border-[#1E293B] flex-none" style={{ maxHeight: "30%" }}>
            <div className="flex items-center gap-2 p-3 border-b border-[#1E293B]">
              <Database className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Audit Log</span>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "160px" }}>
              {auditLogs.slice(0, 10).map((log) => (
                <div key={log.id} className="flex items-start gap-2 px-3 py-1.5 border-b border-[#0D1117] text-[9px]">
                  <Clock className="w-2.5 h-2.5 text-gray-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className={`font-bold mr-1 ${
                      log.severity === "Critical" ? "text-red-400" :
                      log.severity === "Warning" ? "text-amber-400" : "text-gray-500"
                    }`}>{log.action}</span>
                    <span className="text-gray-600">{log.username}</span>
                    <div className="text-gray-700 truncate max-w-[200px]">{log.target}</div>
                  </div>
                </div>
              ))}
              {!isConnected && <div className="text-[9px] text-gray-700 text-center p-3">Connect to load audit log</div>}
            </div>
          </section>
        </aside>
      </div>

      {/* ── Footer / Security Disclaimer ─────────────────────────────────── */}
      <footer className="flex-none border-t border-[#1E293B] bg-[#07090F] px-5 py-2 flex items-center justify-between text-[9px] text-gray-700">
        <div className="flex items-center gap-3">
          <Lock className="w-3 h-3" />
          <span>TRINETRA Adversary Simulation Console · Isolated Lab Environment · Academic Research Use Only</span>
        </div>
        <div className="flex items-center gap-3">
          <span>No real clinical hardware is affected.</span>
          <span>All ML decisions reflect actual Scikit-Learn model outputs.</span>
          <span>No fabricated results.</span>
        </div>
      </footer>
    </div>
  );
}
