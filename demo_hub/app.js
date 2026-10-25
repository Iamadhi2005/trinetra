/**
 * TRINETRA Standalone Security Testbed & Evaluation Console
 * Port 3002
 * Communicates with TRINETRA API Gateway at http://localhost:8000
 */

const DEFAULT_URL = "https://trinetra-ya1h.onrender.com";
let BACKEND_URL = (typeof localStorage !== "undefined" && localStorage.getItem("trinetra_testbed_backend")) || DEFAULT_URL;
let API_BASE = `${BACKEND_URL}/api`;
let WS_BASE = BACKEND_URL.replace(/^http/, "ws");

function setBackendGateway(url) {
  BACKEND_URL = url.replace(/\/+$/, "");
  API_BASE = `${BACKEND_URL}/api`;
  WS_BASE = BACKEND_URL.replace(/^http/, "ws");
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("trinetra_testbed_backend", BACKEND_URL);
  }
  updateGatewayStatusUI();
  logTerminal(`Switched active gateway to: ${BACKEND_URL}`, "sys");
  loadPatients();
  pollAttackState();
  initTelemetryWebSocket(selectedTarget);
}

function updateGatewayStatusUI() {
  const statusEl = document.getElementById("backend-status-text");
  if (statusEl) {
    statusEl.textContent = BACKEND_URL.includes("render.com") ? "☁️ Render Cloud" : "🏥 Local:8000";
  }
}

// ── State ──────────────────────────────────────────────────
let selectedTarget = "patient_102";
let currentAttackMode = "Normal";
let currentTargetPatient = "";
let attackStartTime = null;
let timerInterval = null;
let telemetrySocket = null;
let currentCategoryFilter = "all";

// ── Table 6 Test Scenario Specifications ───────────────────
const ATTACK_SCENARIOS = [
  {
    mode: "Override",
    title: "Pacemaker & Infusion Actuator Override",
    category: "layer1",
    categoryLabel: "Layer 1: Medical & Physiology",
    target: "Pacemaker Pacing Rate & Infusion Pump",
    severity: "critical",
    desc: "Simulates out-of-bounds actuator commands commanding elevated cardiac pacing rate and excess medication flow.",
    reportRef: "Table 6: 'Pacemaker override'",
    payload: "Target parameters: Pacing=180 ppm, Infusion=500.0 mL/h. Vitals shift (HR=190 bpm, BP drops to 50 mmHg). Zero-Trust IPS triggers safe KVO mode (1.0 mL/h)."
  },
  {
    mode: "Drain",
    title: "Battery Depletion Test",
    category: "layer1",
    categoryLabel: "Layer 1: Power & Battery",
    target: "Internal Battery & Power Management Subsystem",
    severity: "high",
    desc: "Evaluates system response to rapid power loss and accelerated battery drain telemetry.",
    reportRef: "Table 6: 'Battery drain'",
    payload: "Simulates high-draw loop reducing battery level by ~5% per cycle to evaluate warning triggers."
  },
  {
    mode: "Fault",
    title: "Sensor Detachment (Loose Lead Fault)",
    category: "layer1",
    categoryLabel: "Layer 1: Sensor & Hardware",
    target: "ECG Lead II Biosensor Contact Hardware",
    severity: "warning",
    desc: "Simulates electrode contact disruption, signal noise, and high contact impedance.",
    reportRef: "Table 6: 'Sensor Failure'",
    payload: "Impedance shifts to 10,000 Ω. Layer 1 Isolation Forest identifies sensor detachment without isolating patient."
  },
  {
    mode: "DoS",
    title: "High-Volume Volumetric Flow Test",
    category: "layer2",
    categoryLabel: "Layer 2: Network & Protocol",
    target: "Hospital Telemetry Message Broker & Ingestion Queue",
    severity: "high",
    desc: "High-frequency packet bursts testing gateway throughput and buffer threshold enforcement.",
    reportRef: "Table 6: 'DoS'",
    payload: "Transmits 450-byte telemetry bursts at >180 pkts/s (CIC-IoMT-2024 profile). Gateway rate exceeds 20 pkts/s limit."
  },
  {
    mode: "MitM",
    title: "Telemetry Integrity & Spoofing Test",
    category: "layer2",
    categoryLabel: "Layer 2: Cryptography & Integrity",
    target: "HMAC-SHA256 Cryptographic Verification",
    severity: "critical",
    desc: "Injects modified physiological values with invalidated cryptographic message authentication codes.",
    reportRef: "Table 6: 'Spoofing'",
    payload: "Modifies vitals payload and alters HMAC signature. Gateway cryptographic verification rejects frame."
  },
  {
    mode: "Replay",
    title: "Temporal Replay & Stale Data Verification",
    category: "layer2",
    categoryLabel: "Layer 2: Protocol & Timestamps",
    target: "Timestamp Latency & Replay Window",
    severity: "high",
    desc: "Re-transmits cached historical baseline telemetry to test temporal validation filters.",
    reportRef: "Table 6: 'Replay / abnormal data'",
    payload: "Broadcasts packets with timestamp latency exceeding 3000ms. Temporal verification window identifies delay."
  },
  {
    mode: "BruteForce",
    title: "Gateway Authentication Rate-Limit Test",
    category: "layer2",
    categoryLabel: "Layer 2: Access Control & Gateway Auth",
    target: "IoMT REST API Gateway & Authentication Service",
    severity: "critical",
    desc: "Simulates rapid unauthorized token requests to test API rate-limiting safeguards.",
    reportRef: "Table 6: 'Brute-force activity'",
    payload: "Consecutive authentication requests with invalid credentials. Gateway engages temporary rate limiting."
  }
];

// ── IPS Rules Data ─────────────────────────────────────────
const IPS_RULES_DATA = [
  {
    name: "Volumetric Rate Limiter",
    target: "Network Gateway (Layer 2)",
    threshold: "20.0 pkts/sec",
    action: "Autonomous Isolation & Rate Throttling",
    desc: "Isolates client sessions transmitting above 20 pkts/sec to protect queue buffer."
  },
  {
    name: "Physiological Outlier Filter",
    target: "Vital Guard (Isolation Forest)",
    threshold: "Anomaly Score < -0.015",
    action: "Actuator Safe-State Fallback (KVO 1.0 mL/h)",
    desc: "Detects unphysiological vital parameters and commands infusion pumps into safe Keep-Vein-Open mode."
  },
  {
    name: "HMAC-SHA256 Cryptographic Verification",
    target: "Telemetry Payload Integrity",
    threshold: "Signature Verification Fail",
    action: "Instant Frame Rejection & Incident Audit",
    desc: "Verifies SHA-256 integrity tokens for every telemetry frame and discards invalid frames."
  },
  {
    name: "Temporal Replay Window Verification",
    target: "Packet Timestamp Latency",
    threshold: "Latency Delta > 3000ms",
    action: "Stale Telemetry Rejection",
    desc: "Rejects frames bearing historical timestamps to ensure live clinical freshness."
  }
];

// ── Initialization ─────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  updateGatewayStatusUI();
  logTerminal("TRINETRA Security Testbed initialized.", "sys");
  logTerminal(`Connected to backend gateway at ${BACKEND_URL}. Ready for scenario execution.`, "sys");
  
  renderScenariosGrid();
  renderIpsRules();
  loadPatients();
  pollAttackState();
  initTelemetryWebSocket(selectedTarget);
  
  setInterval(pollAttackState, 2000);
});

// ── Activity Audit Logger ──────────────────────────────────
function logTerminal(message, type = "sys") {
  const terminal = document.getElementById("terminal-body");
  if (!terminal) return;
  
  const time = new Date().toLocaleTimeString();
  const line = document.createElement("div");
  line.className = `log-line ${type}`;
  
  let prefix = "[SYSTEM]";
  if (type === "exploit") prefix = "[TEST]";
  else if (type === "defense") prefix = "[DEFENSE]";
  else if (type === "warning") prefix = "[WARN]";
  else if (type === "error") prefix = "[ERROR]";
  
  line.textContent = `${prefix} [${time}] ${message}`;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}

function clearTerminalLogs() {
  const terminal = document.getElementById("terminal-body");
  if (terminal) terminal.innerHTML = "";
  logTerminal("Log buffer cleared.", "sys");
}

function copyTerminalLogs() {
  const terminal = document.getElementById("terminal-body");
  if (!terminal) return;
  const text = Array.from(terminal.children).map(c => c.textContent).join("\n");
  navigator.clipboard.writeText(text).then(() => {
    logTerminal("Activity log copied to clipboard.", "sys");
  });
}

// ── Patient Selector ───────────────────────────────────────
async function loadPatients() {
  try {
    const res = await fetch(`${API_BASE}/patients`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const patients = await res.json();
    
    const select = document.getElementById("target-patient-select");
    if (!select) return;
    
    select.innerHTML = "";
    patients.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.name} (${p.ward || 'ICU'} / Bed ${p.bed || '01'})`;
      if (p.id === selectedTarget) opt.selected = true;
      select.appendChild(opt);
    });
    
    const broadcastOpt = document.createElement("option");
    broadcastOpt.value = "";
    broadcastOpt.textContent = "All Hospital Units (Broadcast)";
    select.appendChild(broadcastOpt);
    
    updateTargetLabel();
  } catch (err) {
    logTerminal(`Note: Using cached patient profiles (${err.message}).`, "sys");
  }
}

function handleTargetChange(val) {
  selectedTarget = val;
  updateTargetLabel();
  initTelemetryWebSocket(selectedTarget || "patient_102");
  logTerminal(`Patient unit focus updated to: ${selectedTarget || 'ALL_UNITS'}`, "sys");
}

function updateTargetLabel() {
  const select = document.getElementById("target-patient-select");
  const targetNameEl = document.getElementById("banner-target-name");
  if (select && targetNameEl) {
    const text = select.options[select.selectedIndex]?.text || selectedTarget;
    targetNameEl.textContent = text.split(" (")[0] || selectedTarget || "All Units";
  }
}

// ── Live Telemetry WebSocket ───────────────────────────────
function initTelemetryWebSocket(patientId) {
  if (telemetrySocket) {
    try { telemetrySocket.close(); } catch (e) {}
  }
  
  const targetId = patientId || "patient_102";
  const wsUrl = `${WS_BASE}/ws/telemetry/${targetId}`;
  
  try {
    telemetrySocket = new WebSocket(wsUrl);
    
    telemetrySocket.onopen = () => {
      const statusText = document.getElementById("backend-status-text");
      if (statusText) statusText.textContent = "Backend: Connected (Live Stream)";
    };
    
    telemetrySocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        updateLiveVitalsHUD(data);
      } catch (e) {}
    };
    
    telemetrySocket.onerror = () => {
      const statusText = document.getElementById("backend-status-text");
      if (statusText) statusText.textContent = "Backend: Standby";
    };
  } catch (err) {
    console.error("WS error:", err);
  }
}

function updateLiveVitalsHUD(data) {
  const hrEl = document.getElementById("hud-hr");
  const spo2El = document.getElementById("hud-spo2");
  const bpEl = document.getElementById("hud-bp");
  const infusionEl = document.getElementById("hud-infusion");
  const pacingEl = document.getElementById("hud-pacing");
  const batteryEl = document.getElementById("hud-battery");
  const quarantineBadge = document.getElementById("hud-quarantine-badge");
  const quarantineSub = document.getElementById("hud-quarantine-sub");

  if (hrEl && data.heart_rate !== undefined) hrEl.textContent = Math.round(data.heart_rate);
  if (spo2El && data.spo2 !== undefined) spo2El.textContent = (data.spo2).toFixed(1);
  if (bpEl && data.blood_pressure) bpEl.textContent = data.blood_pressure;
  if (infusionEl && data.infusion_level !== undefined) infusionEl.textContent = Number(data.infusion_level).toFixed(1);
  if (pacingEl && data.pacing_rate !== undefined) pacingEl.textContent = Math.round(data.pacing_rate);
  if (batteryEl && data.battery !== undefined) batteryEl.textContent = Math.round(data.battery);

  const isQuarantine = data.status === "Quarantine" || data.status === "Isolated";
  if (quarantineBadge) {
    if (isQuarantine) {
      quarantineBadge.className = "quarantine-tag quarantine";
      quarantineBadge.textContent = "Isolated by IPS";
      if (quarantineSub) quarantineSub.textContent = "Actuator safe fallback";
    } else {
      quarantineBadge.className = "quarantine-tag online";
      quarantineBadge.textContent = "Active / Secure";
      if (quarantineSub) quarantineSub.textContent = "Zero-Trust IPS Active";
    }
  }
}

// ── Attack Status Poller ───────────────────────────────────
async function pollAttackState() {
  try {
    const res = await fetch(`${API_BASE}/security/attack`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    const newMode = data.attack_mode || "Normal";
    const newTarget = data.target_patient || "";
    
    if (newMode !== currentAttackMode || newTarget !== currentTargetPatient) {
      currentAttackMode = newMode;
      currentTargetPatient = newTarget;
      updateAttackUI(newMode, newTarget);
    }
  } catch (err) {
    const statusText = document.getElementById("backend-status-text");
    if (statusText) statusText.textContent = "Backend: Reconnecting";
  }
}

function updateAttackUI(mode, target) {
  const badge = document.getElementById("banner-badge");
  const desc = document.getElementById("banner-desc");
  const btnReset = document.getElementById("btn-emergency-disengage");
  
  if (mode === "Normal") {
    if (badge) {
      badge.className = "banner-pill idle";
      badge.textContent = "Normal Baseline";
    }
    if (desc) desc.textContent = "All IoMT telemetry running within verified safe physiological and network thresholds.";
    if (btnReset) btnReset.classList.remove("active-test");
    stopTimer();
  } else {
    const scenario = ATTACK_SCENARIOS.find(s => s.mode === mode);
    if (badge) {
      badge.className = "banner-pill active";
      badge.textContent = `Simulation Active: ${mode}`;
    }
    if (desc) desc.textContent = scenario ? `${scenario.title} — ${scenario.desc}` : `Scenario '${mode}' currently active on target unit.`;
    if (btnReset) btnReset.classList.add("active-test");
    startTimer();
  }
  
  renderScenariosGrid();
}

function startTimer() {
  if (timerInterval) return;
  attackStartTime = Date.now();
  timerInterval = setInterval(() => {
    const diff = Math.floor((Date.now() - attackStartTime) / 1000);
    const mins = String(Math.floor(diff / 60)).padStart(2, "0");
    const secs = String(diff % 60).padStart(2, "0");
    const el = document.getElementById("banner-timer");
    if (el) el.textContent = `${mins}:${secs}`;
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  const el = document.getElementById("banner-timer");
  if (el) el.textContent = "00:00";
}

// ── Render Scenario Cards ──────────────────────────────────
function renderScenariosGrid() {
  const grid = document.getElementById("scenarios-grid");
  if (!grid) return;
  
  const filtered = ATTACK_SCENARIOS.filter(s => {
    if (currentCategoryFilter === "all") return true;
    return s.category === currentCategoryFilter;
  });
  
  grid.innerHTML = filtered.map(scenario => {
    const isActive = currentAttackMode === scenario.mode;
    return `
      <div class="scenario-card ${isActive ? 'is-active' : ''}">
        <div class="card-top">
          <div class="scenario-heading">
            <span class="scenario-category">${scenario.categoryLabel}</span>
            <h3 class="scenario-title">${scenario.title}</h3>
          </div>
          <span class="severity-pill ${scenario.severity}">${scenario.severity.toUpperCase()}</span>
        </div>

        <p class="card-desc">${scenario.desc}</p>

        <div class="card-target-box">
          <div class="target-row">
            <span class="target-label">Target Subsystem:</span>
            <span class="target-value">${scenario.target}</span>
          </div>
          <div class="target-row">
            <span class="target-label">Verification Specification:</span>
            <span class="target-value">${scenario.reportRef}</span>
          </div>
        </div>

        <div class="payload-preview">
          ${scenario.payload}
        </div>

        <div class="card-actions">
          <button 
            class="btn-launch-attack ${isActive ? 'is-active-btn' : ''}" 
            onclick="handleDeployAttack('${scenario.mode}')"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="${isActive ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <span>${isActive ? 'Scenario Active (Click to Re-send)' : 'Run Test Scenario'}</span>
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function filterCategory(cat, btn) {
  currentCategoryFilter = cat;
  document.querySelectorAll(".category-filters .filter-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderScenariosGrid();
}

// ── Scenario Execution Handlers ────────────────────────────
async function handleDeployAttack(mode) {
  const scenario = ATTACK_SCENARIOS.find(s => s.mode === mode);
  const target = selectedTarget;
  
  logTerminal(`Starting scenario: [${mode}] ${scenario?.title || ''} on ${target || 'All Units'}`, "exploit");
  logTerminal(`Target Subsystem: ${scenario?.target}`, "sys");
  
  try {
    const res = await fetch(`${API_BASE}/security/attack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attack_mode: mode,
        target_patient: target
      })
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    currentAttackMode = mode;
    currentTargetPatient = target;
    updateAttackUI(mode, target);
    
    logTerminal(`Gateway response: ${data.message || 'Scenario initiated'}`, "defense");
  } catch (err) {
    logTerminal(`Scenario execution failed: ${err.message}`, "error");
  }
}

async function handleEmergencyDisengage() {
  logTerminal("Resetting system to baseline... Neutralizing simulated flows.", "defense");
  try {
    const res = await fetch(`${API_BASE}/security/disengage`, { method: "POST" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    currentAttackMode = "Normal";
    currentTargetPatient = "";
    updateAttackUI("Normal", "");
    
    logTerminal(`System baseline restored: ${data.message || 'Normal parameters active'}`, "sys");
  } catch (err) {
    logTerminal(`Reset failed: ${err.message}`, "error");
  }
}

async function handleRecalibrate() {
  const target = selectedTarget || "patient_102";
  logTerminal(`Recalibrating sensor baseline for ${target}...`, "sys");
  try {
    const res = await fetch(`${API_BASE}/patients/${target}/calibrate`, { method: "POST" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    logTerminal(`Recalibration complete: ${data.message || 'Vitals baseline normalized'}`, "sys");
  } catch (err) {
    logTerminal(`Recalibration notice: ${err.message}`, "sys");
  }
}

// ── Tab Navigation ─────────────────────────────────────────
function switchTab(tabId) {
  document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-tabs .tab-btn").forEach(b => b.classList.remove("active"));
  
  const pane = document.getElementById(`tab-pane-${tabId}`);
  if (pane) pane.classList.add("active");
  
  const btn = event.currentTarget;
  if (btn) btn.classList.add("active");
}

// ── Pure ML What-If Lab ────────────────────────────────────
function updateSlider(name, val) {
  const el = document.getElementById(`val-${name}`);
  if (el) el.textContent = val;
}

function applyPreset(preset) {
  if (preset === "benign") {
    setSliderValues(2.4, 1.2, 180, 160, 800.0);
  } else if (preset === "dos") {
    setSliderValues(8.5, 185.0, 3800, 950, 4.2);
  } else if (preset === "mitm") {
    setSliderValues(4.2, 12.0, 640, 320, 85.0);
  } else if (preset === "micro") {
    setSliderValues(0.3, 75.0, 520, 260, 12.0);
  }
  handleEvaluatePureML();
}

function setSliderValues(duration, rate, size, avg, iat) {
  document.getElementById("slider-duration").value = duration;
  document.getElementById("slider-packet-rate").value = rate;
  document.getElementById("slider-packet-size").value = size;
  document.getElementById("slider-avg-packet-size").value = avg;
  document.getElementById("slider-iat").value = iat;
  
  updateSlider("duration", duration);
  updateSlider("packet-rate", rate);
  updateSlider("packet-size", size);
  updateSlider("avg-packet-size", avg);
  updateSlider("iat", iat);
}

function getFeaturePayload() {
  return {
    features: {
      duration: parseFloat(document.getElementById("slider-duration").value),
      packet_rate: parseFloat(document.getElementById("slider-packet-rate").value),
      packet_size: parseFloat(document.getElementById("slider-packet-size").value),
      avg_packet_size: parseFloat(document.getElementById("slider-avg-packet-size").value),
      iat: parseFloat(document.getElementById("slider-iat").value)
    },
    vitals: {
      heart_rate: 75,
      spo2: 98.0,
      systolic_bp: 120,
      diastolic_bp: 80,
      lead_impedance: 500,
      infusion_rate: 1.0
    }
  };
}

async function handleEvaluatePureML() {
  const payload = getFeaturePayload();
  logTerminal(`Evaluating 5-parameter flow vector with Scikit-Learn models...`, "sys");
  
  try {
    const res = await fetch(`${API_BASE}/security/pure-ml/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    updateGauges(data);
    logTerminal(`Evaluation output: P(Attack)=${(data.l2_probability * 100).toFixed(1)}% | IF Score=${data.l1_score.toFixed(3)} | Verdict=${data.verdict}`, "sys");
  } catch (err) {
    logTerminal(`Model evaluation notice: ${err.message}`, "sys");
  }
}

async function handleInjectPureML() {
  const target = selectedTarget;
  logTerminal(`Transmitting test flow vector without synthetic overrides...`, "exploit");
  
  try {
    const res = await fetch(`${API_BASE}/security/pure-ml/attack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attack_mode: "DoS",
        target_patient: target
      })
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    logTerminal(`Test flow active: ${data.message}`, "defense");
  } catch (err) {
    logTerminal(`Flow transmission failed: ${err.message}`, "error");
  }
}

function updateGauges(data) {
  const prob = (data.l2_probability || 0) * 100;
  const l1Score = data.l1_score !== undefined ? data.l1_score : 0.15;
  const isAttack = data.is_l2_anomaly || prob > 50 || l1Score < -0.015;
  
  // Layer 2 UI
  const l2Display = document.getElementById("l2-prob-display");
  const l2Bar = document.getElementById("l2-prob-bar");
  const l2Pill = document.getElementById("l2-status-pill");
  
  if (l2Display) l2Display.textContent = `${prob.toFixed(1)}%`;
  if (l2Bar) {
    l2Bar.style.width = `${Math.min(100, Math.max(2, prob))}%`;
    l2Bar.style.backgroundColor = prob > 50 ? "var(--color-rose)" : "var(--color-emerald)";
  }
  if (l2Pill) {
    if (prob > 50) {
      l2Pill.textContent = "Anomalous";
      l2Pill.style.background = "var(--color-rose-subtle)";
      l2Pill.style.color = "var(--color-rose)";
      l2Pill.style.borderColor = "var(--color-rose-border)";
    } else {
      l2Pill.textContent = "Benign";
      l2Pill.style.background = "var(--color-emerald-subtle)";
      l2Pill.style.color = "var(--color-emerald)";
      l2Pill.style.borderColor = "var(--color-emerald-border)";
    }
  }

  // Layer 1 UI
  const l1Display = document.getElementById("l1-score-display");
  const l1Bar = document.getElementById("l1-score-bar");
  const l1Pill = document.getElementById("l1-status-pill");
  
  if (l1Display) l1Display.textContent = (l1Score > 0 ? "+" : "") + l1Score.toFixed(3);
  if (l1Bar) {
    const pct = ((l1Score + 0.5) / 1.0) * 100;
    l1Bar.style.width = `${Math.min(100, Math.max(5, pct))}%`;
    l1Bar.style.backgroundColor = l1Score < 0 ? "var(--color-rose)" : "var(--color-emerald)";
  }
  if (l1Pill) {
    if (l1Score < 0) {
      l1Pill.textContent = "Physiological Outlier";
      l1Pill.style.background = "var(--color-rose-subtle)";
      l1Pill.style.color = "var(--color-rose)";
      l1Pill.style.borderColor = "var(--color-rose-border)";
    } else {
      l1Pill.textContent = "Normal";
      l1Pill.style.background = "var(--color-emerald-subtle)";
      l1Pill.style.color = "var(--color-emerald)";
      l1Pill.style.borderColor = "var(--color-emerald-border)";
    }
  }

  // Verdict Banner
  const verdictEl = document.getElementById("verdict-text");
  const verdictDetails = document.getElementById("verdict-details");
  if (verdictEl) {
    if (isAttack) {
      verdictEl.className = "verdict-state attack";
      verdictEl.textContent = "Anomalous Telemetry Flagged";
      if (verdictDetails) verdictDetails.textContent = "Model decision boundary crossed. Autonomous IPS protection triggered.";
    } else {
      verdictEl.className = "verdict-state benign";
      verdictEl.textContent = "Benign Medical Telemetry";
      if (verdictDetails) verdictDetails.textContent = "Flow telemetry conforms to standard physiological and clinical transmission parameters.";
    }
  }
}

// ── Render IPS Rules ───────────────────────────────────────
function renderIpsRules() {
  const container = document.getElementById("ips-rules-grid");
  if (!container) return;
  
  container.innerHTML = IPS_RULES_DATA.map(rule => `
    <div class="scenario-card">
      <div class="card-top">
        <div class="scenario-heading">
          <span class="scenario-category">${rule.target}</span>
          <h3 class="scenario-title">${rule.name}</h3>
        </div>
        <span class="severity-pill warning">ACTIVE</span>
      </div>
      <p class="card-desc">${rule.desc}</p>
      <div class="card-target-box">
        <div class="target-row">
          <span class="target-label">Trigger Boundary:</span>
          <span class="target-value">${rule.threshold}</span>
        </div>
        <div class="target-row">
          <span class="target-label">Protection Action:</span>
          <span class="target-value">${rule.action}</span>
        </div>
      </div>
    </div>
  `).join("");
}
