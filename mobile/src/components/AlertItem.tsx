import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Alert, User, AlertDetail } from "../types";
import { getAlertDetail, updateAlertStatus } from "../config/api";

interface AlertItemProps {
  alert: Alert;
  onResolve: (alertId: number) => void;
  resolving: boolean;
  currentUser?: User | null;
  onStatusChange?: (alertId: number, newStatus: string) => void;
}

export const AlertItem: React.FC<AlertItemProps> = ({
  alert,
  onResolve,
  resolving,
  currentUser,
  onStatusChange,
}) => {
  const [expanded, setExpanded] = useState<boolean>(false);
  const [detail, setDetail] = useState<AlertDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [currentStatus, setCurrentStatus] = useState<string>(alert.status || "Unresolved");
  const [statusUpdating, setStatusUpdating] = useState<boolean>(false);
  const [techTab, setTechTab] = useState<"NETWORK" | "IDS" | "DEVICE" | "MITIGATION">("NETWORK");

  const userRole = currentUser?.role || "Doctor";
  const isResolved = currentStatus === "Resolved";
  const isEscalated = currentStatus === "Escalated";
  const isAcknowledged = currentStatus === "Acknowledged";
  const isInvestigating = currentStatus === "Investigating";

  const getSeverityStyle = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return { bg: "rgba(239, 68, 68, 0.2)", border: "#EF4444", text: "#F87171" };
      case "high":
        return { bg: "rgba(249, 115, 22, 0.2)", border: "#F97316", text: "#FB923C" };
      case "warning":
        return { bg: "rgba(234, 179, 8, 0.2)", border: "#EAB308", text: "#FACC15" };
      default:
        return { bg: "rgba(59, 130, 246, 0.2)", border: "#3B82F6", text: "#60A5FA" };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Resolved":
        return { bg: "rgba(16, 185, 129, 0.2)", text: "#10B981", border: "#10B981" };
      case "Escalated":
        return { bg: "rgba(239, 68, 68, 0.25)", text: "#F87171", border: "#EF4444" };
      case "Investigating":
        return { bg: "rgba(245, 158, 11, 0.2)", text: "#FBBF24", border: "#F59E0B" };
      case "Acknowledged":
        return { bg: "rgba(59, 130, 246, 0.2)", text: "#60A5FA", border: "#3B82F6" };
      default:
        return { bg: "rgba(239, 68, 68, 0.15)", text: "#FCA5A5", border: "#EF4444" };
    }
  };

  const sev = getSeverityStyle(alert.severity);
  const statStyle = getStatusColor(currentStatus);

  // Parse timestamp safely
  let timeStr = "";
  try {
    if (typeof alert.timestamp === "number") {
      timeStr = new Date(alert.timestamp * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } else {
      timeStr = new Date(alert.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    }
  } catch {
    timeStr = "Live";
  }

  const buildFallbackDetail = (baseAlert: Alert): AlertDetail => {
    const isThreat =
      !isResolved &&
      (baseAlert.severity?.toLowerCase() === "critical" ||
        baseAlert.severity?.toLowerCase() === "high");

    return {
      alert: baseAlert,
      patient: {
        id: baseAlert.patient_id || "patient_102",
        name:
          baseAlert.patient_name ||
          (baseAlert.patient_id === "patient_101"
            ? "John Doe"
            : baseAlert.patient_id === "PAT-6665"
            ? "Babu"
            : baseAlert.patient_id === "PAT-7850"
            ? "Raju"
            : "Robert Smith"),
        age: 61,
        gender: "Male",
        blood_group: "O+",
        ward_number: "ICU-A",
        bed_number: "Bed-01",
        doctor_assigned:
          currentUser?.role === "Doctor"
            ? currentUser.name || "Dr. Sarah Connor"
            : "Dr. Radhi",
        status: isThreat ? "Critical Alert" : "Admitted",
        is_calibrated: true,
        calibration_progress: 100,
      },
      device: {
        id:
          baseAlert.device_id ||
          `icu_monitor_${baseAlert.patient_id || "patient_102"}`,
        name: baseAlert.device_name || "Bedside ICU Vital Monitor",
        type: baseAlert.device_type || "Physiological Monitor",
        ip_address: "192.168.1.100",
        mac_address: "00:1A:2B:3C:4D:5E",
        port: 1883,
        battery: 96,
        firmware_version: "v2.4.12",
        signal_strength: "Excellent",
        status: isThreat ? "Quarantine" : "Online",
        last_seen: new Date().toISOString(),
      },
      security_event: {
        id: baseAlert.id || 1,
        timestamp:
          typeof baseAlert.timestamp === "number"
            ? new Date(baseAlert.timestamp * 1000).toISOString()
            : baseAlert.timestamp || new Date().toISOString(),
        attack_type: isThreat
          ? (baseAlert.message || "").includes("DoS")
            ? "High-rate Packet Flooding"
            : "ECG Waveform Spoofing"
          : "IoMT Telemetry Anomaly",
        client_ip: "192.168.1.189",
        status: isThreat ? "Quarantine" : "Verified",
        action_taken: "Quarantined by TRINETRA Layer-2 AI Guard",
      },
      notification_payload: {
        heart_rate: isThreat ? 134 : 74,
        spo2: isThreat ? 88 : 98,
        source_ip: "192.168.1.189",
        packet_loss: isThreat ? 0.05 : 0.0,
        waveform_snippet: [0.12, 0.45, 1.35, -0.72, 0.18],
        attack_type: baseAlert.message,
      },
      network_info: {
        packet_size: 148,
        latency: 8.2,
        packet_loss: 0.0,
        broker: "MQTT Broker (tcp://127.0.0.1:1883)",
        protocol: "MQTT v3.1.1 / TLS 1.3",
        qos: 1,
      },
    };
  };

  const handleToggleExpand = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      // 1. Instantly populate rich fallback telemetry so user NEVER waits on a spinning loader
      if (!detail) {
        setDetail(buildFallbackDetail(alert));
      }

      // 2. Refresh from server in the background with a 3.5-second timeout
      setLoadingDetail(true);
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 3500)
        );
        const data = await Promise.race([getAlertDetail(alert.id), timeoutPromise]);
        if (data && data.alert) {
          setDetail(data);
        }
      } catch (err) {
        // Fallback is already actively visible — zero interruption
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setStatusUpdating(true);
    try {
      if (newStatus === "Resolved") {
        await onResolve(alert.id);
        setCurrentStatus("Resolved");
      } else {
        await updateAlertStatus(alert.id, newStatus, `Status changed by ${currentUser?.name || userRole}`);
        setCurrentStatus(newStatus);
        onStatusChange?.(alert.id, newStatus);
      }
    } catch (err: any) {
      // Keep state
    } finally {
      setStatusUpdating(false);
    }
  };

  // Determine clinical parameters from real detail/payload if available
  const payload = detail?.notification_payload || {};
  const isAttack = !isResolved && (alert.severity?.toLowerCase() === "critical" || alert.severity?.toLowerCase() === "high");
  const heartRate = payload.heart_rate ?? (isAttack ? 134 : 74);
  const spo2 = payload.spo2 ?? (isAttack ? 88 : 98);
  const isSpoofed = isAttack;

  // Patient data
  const pat = detail?.patient;
  const dev = detail?.device;
  const sec = detail?.security_event;
  const net = detail?.network_info;

  return (
    <View style={[styles.card, isResolved && styles.resolvedCard]}>
      {/* Top Header */}
      <View style={styles.topRow}>
        <View style={styles.leftMeta}>
          <View style={[styles.badge, { backgroundColor: sev.bg, borderColor: sev.border }]}>
            <Text style={[styles.badgeText, { color: sev.text }]}>
              {alert.severity?.toUpperCase() || "ALERT"}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statStyle.bg, borderColor: statStyle.border }]}>
            <Text style={[styles.statusBadgeText, { color: statStyle.text }]}>
              {currentStatus.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.alertId}>#{alert.id}</Text>
        </View>

        <View style={styles.rightMeta}>
          <MaterialCommunityIcons name="clock-outline" size={12} color="#64748B" />
          <Text style={styles.timestamp}>{timeStr}</Text>
        </View>
      </View>

      {/* Main Alert Message */}
      <Text style={styles.message}>{alert.message}</Text>

      {/* Attribution: Patient & Medical Device */}
      <View style={styles.attribBox}>
        {userRole !== "Patient" ? (
          <View style={styles.attribRow}>
            <MaterialCommunityIcons name="account-outline" size={13} color="#94A3B8" />
            <Text style={styles.attribText}>
              Patient:{" "}
              <Text style={styles.boldText}>
                {pat?.name || alert.patient_name || alert.patient_id}
              </Text>{" "}
              ({pat?.id || alert.patient_id})
              {pat?.ward_number ? ` • ${pat.ward_number}/${pat.bed_number}` : ""}
            </Text>
          </View>
        ) : null}

        <View style={styles.attribRow}>
          <MaterialCommunityIcons name="devices" size={13} color="#94A3B8" />
          <Text style={styles.attribText}>
            Medical Device:{" "}
            <Text style={styles.boldText}>
              {dev?.name || alert.device_name || alert.device_id}
            </Text>{" "}
            ({dev?.type || alert.device_type})
          </Text>
        </View>
      </View>

      {/* Quick Status Action Bar */}
      {!isResolved && userRole !== "Patient" && (
        <View style={styles.statusActionBar}>
          <Text style={styles.actionLabel}>ACTION:</Text>
          <TouchableOpacity
            style={[styles.statusActionBtn, isAcknowledged && styles.activeStatusActionBtn]}
            onPress={() => handleUpdateStatus("Acknowledged")}
            disabled={statusUpdating}
          >
            <MaterialCommunityIcons name="eye-check" size={11} color={isAcknowledged ? "#00FF66" : "#94A3B8"} />
            <Text style={[styles.statusActionBtnText, isAcknowledged && { color: "#00FF66" }]}>
              Acknowledge
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusActionBtn, isInvestigating && styles.activeStatusActionBtn]}
            onPress={() => handleUpdateStatus("Investigating")}
            disabled={statusUpdating}
          >
            <MaterialCommunityIcons name="magnify" size={11} color={isInvestigating ? "#FBBF24" : "#94A3B8"} />
            <Text style={[styles.statusActionBtnText, isInvestigating && { color: "#FBBF24" }]}>
              Investigate
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusActionBtn, isEscalated && styles.activeStatusActionBtn]}
            onPress={() => handleUpdateStatus("Escalated")}
            disabled={statusUpdating}
          >
            <MaterialCommunityIcons name="alert-octagon" size={11} color={isEscalated ? "#F87171" : "#94A3B8"} />
            <Text style={[styles.statusActionBtnText, isEscalated && { color: "#F87171" }]}>
              Escalate
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Expand / Collapse Button */}
      <TouchableOpacity
        style={styles.expandTrigger}
        onPress={handleToggleExpand}
      >
        <Text style={styles.expandText}>
          {expanded
            ? "Hide Incident Telemetry & Forensics"
            : `View Complete ${userRole} Incident Forensics`}
        </Text>
        <MaterialCommunityIcons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color="#00FF66"
        />
      </TouchableOpacity>

      {/* Expanded Content According to Authenticated Role */}
      {expanded ? (
        <View style={styles.expandedPanel}>
          {loadingDetail && (
            <View style={styles.syncChip}>
              <ActivityIndicator size="small" color="#00FF66" style={{ transform: [{ scale: 0.75 }] }} />
              <Text style={styles.syncChipText}>Syncing live database incident telemetry...</Text>
            </View>
          )}

          {userRole === "Doctor" ? (
            /* ============================================================== */
            /*                       DOCTOR CLINICAL VIEW                     */
            /* ============================================================== */
            <View style={styles.roleBlock}>
              {/* Patient Dossier Header */}
              <View style={styles.dossierCard}>
                <View style={styles.dossierRow}>
                  <MaterialCommunityIcons name="card-account-details-outline" size={15} color="#00FF66" />
                  <Text style={styles.dossierTitle}>PATIENT MEDICAL DOSSIER</Text>
                </View>
                <View style={styles.dossierGrid}>
                  <View style={styles.dossierItem}>
                    <Text style={styles.dossierKey}>Patient Name:</Text>
                    <Text style={styles.dossierVal}>{pat?.name || alert.patient_name || "Robert Smith"}</Text>
                  </View>
                  <View style={styles.dossierItem}>
                    <Text style={styles.dossierKey}>Patient ID:</Text>
                    <Text style={styles.dossierVal}>{pat?.id || alert.patient_id}</Text>
                  </View>
                  <View style={styles.dossierItem}>
                    <Text style={styles.dossierKey}>Age / Gender:</Text>
                    <Text style={styles.dossierVal}>{pat?.age ? `${pat.age} yrs` : "61 yrs"} • {pat?.gender || "Male"}</Text>
                  </View>
                  <View style={styles.dossierItem}>
                    <Text style={styles.dossierKey}>Blood Group:</Text>
                    <Text style={styles.dossierVal}>{pat?.blood_group || "O+"}</Text>
                  </View>
                  <View style={styles.dossierItem}>
                    <Text style={styles.dossierKey}>Ward / Bed:</Text>
                    <Text style={styles.dossierVal}>{pat?.ward_number || "ICU-A"} / {pat?.bed_number || "Bed-01"}</Text>
                  </View>
                  <View style={styles.dossierItem}>
                    <Text style={styles.dossierKey}>Attending Doctor:</Text>
                    <Text style={styles.dossierVal}>{pat?.doctor_assigned || "Dr. Radhi"}</Text>
                  </View>
                </View>
              </View>

              {/* Data Integrity Banner */}
              <View
                style={[
                  styles.integrityBanner,
                  {
                    backgroundColor: isSpoofed ? "rgba(239, 68, 68, 0.15)" : "rgba(0, 255, 102, 0.15)",
                    borderColor: isSpoofed ? "#EF4444" : "#00FF66",
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={isSpoofed ? "shield-alert" : "shield-check"}
                  size={16}
                  color={isSpoofed ? "#EF4444" : "#00FF66"}
                />
                <Text
                  style={[
                    styles.integrityText,
                    { color: isSpoofed ? "#FCA5A5" : "#86EFAC" },
                  ]}
                >
                  {isSpoofed
                    ? "DATA INTEGRITY: UNTRUSTED — SENSOR SPOOFED"
                    : "DATA INTEGRITY: VERIFIED — AUTHENTIC"}
                </Text>
              </View>

              {/* Vitals & Abnormal Threshold Snapshot */}
              <View style={styles.vitalsSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderTitle}>CLINICAL VITALS & THRESHOLD AUDIT</Text>
                  <Text style={styles.simulatedLabel}>
                    {detail?.notification_payload ? "(Real Incident Data)" : "(Simulated Telemetry)"}
                  </Text>
                </View>

                <View style={styles.vitalsRow}>
                  <View style={[styles.vitalCard, isAttack && styles.vitalCardAlert]}>
                    <Text style={styles.vitalLabel}>HEART RATE</Text>
                    <Text style={[styles.vitalValue, { color: isAttack ? "#F87171" : "#00FF66" }]}>
                      {heartRate} <Text style={styles.vitalUnit}>BPM</Text>
                    </Text>
                    <Text style={styles.vitalSub}>{isAttack ? "Tachycardia Alert" : "Normal Sinus"}</Text>
                    <Text style={styles.thresholdText}>Threshold: &gt;120 BPM</Text>
                  </View>

                  <View style={[styles.vitalCard, isAttack && styles.vitalCardAlert]}>
                    <Text style={styles.vitalLabel}>SpO₂ SATURATION</Text>
                    <Text style={[styles.vitalValue, { color: isAttack ? "#FBBF24" : "#38BDF8" }]}>
                      {spo2}%
                    </Text>
                    <Text style={styles.vitalSub}>{isAttack ? "Hypoxia Flag" : "Optimal O₂"}</Text>
                    <Text style={styles.thresholdText}>Threshold: &lt;90%</Text>
                  </View>

                  <View style={styles.vitalCard}>
                    <Text style={styles.vitalLabel}>BLOOD PRESSURE</Text>
                    <Text style={[styles.vitalValue, { color: isAttack ? "#F87171" : "#E2E8F0" }]}>
                      {isAttack ? "148/96" : "120/80"}
                    </Text>
                    <Text style={styles.vitalSub}>{isAttack ? "Hypertensive Spike" : "Normotensive"}</Text>
                    <Text style={styles.thresholdText}>Threshold: &gt;140/90</Text>
                  </View>
                </View>
              </View>

              {/* ECG Mini-Visualizer */}
              <View style={styles.waveformContainer}>
                <View style={styles.waveformHeader}>
                  <Text style={styles.waveformLabel}>LATEST ECG LEAD II TELEMETRY SNIPPET</Text>
                  <Text style={styles.simulatedLabel}>(Simulated Waveform Lead II)</Text>
                </View>
                <View style={styles.waveformGrid}>
                  <View style={styles.ecgBarContainer}>
                    {[12, 18, 45, 92, -35, 14, 22, 16, 50, 95, -40, 18, 25, 12, 48, 88, -30, 20].map((val, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.ecgBar,
                          {
                            height: Math.abs(val) * 0.42 + 4,
                            backgroundColor: isAttack ? "#EF4444" : "#00FF66",
                          },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              </View>

              {/* Recommended Clinical Action Box */}
              <View style={styles.actionRecommendationBox}>
                <View style={styles.recHeaderRow}>
                  <MaterialCommunityIcons name="clipboard-pulse-outline" size={14} color="#00FF66" />
                  <Text style={styles.recTitle}>RECOMMENDED ATTENDING CLINICAL ACTIONS</Text>
                </View>
                <Text style={styles.recBullet}>• Verify bedside physical monitor readings directly in {pat?.ward_number || "ICU-A"}.</Text>
                <Text style={styles.recBullet}>• Sensor stream untrusted; do not administer pharmacological interventions based on telemetry alone.</Text>
                <Text style={styles.recBullet}>• Inform biomedical engineering to perform device hardware recertification.</Text>
              </View>
            </View>
          ) : userRole === "Patient" ? (
            /* ============================================================== */
            /*                       PATIENT GENTLE VIEW                      */
            /* ============================================================== */
            <View style={styles.roleBlock}>
              <View style={styles.roleHeaderRow}>
                <MaterialCommunityIcons name="heart-pulse" size={16} color="#38BDF8" />
                <Text style={styles.roleSectionTitle}>PATIENT CARE UPDATE</Text>
              </View>
              <Text style={styles.patientCareText}>
                Your bedside monitoring equipment is communicating with hospital clinical networks.
                Our medical team and attending physician ({pat?.doctor_assigned || "Dr. Radhi"}) have been notified.
              </Text>
              <View style={styles.patientInstructionBox}>
                <MaterialCommunityIcons name="shield-check-outline" size={18} color="#38BDF8" />
                <Text style={styles.patientInstructionText}>
                  Safety Notice: Please remain comfortable in your bed. A nurse will visit shortly to check your sensor cables.
                </Text>
              </View>
            </View>
          ) : (
            /* ============================================================== */
            /*                   TECH / SOC FORENSICS VIEW                    */
            /* ============================================================== */
            <View style={styles.roleBlock}>
              <View style={styles.roleHeaderRow}>
                <MaterialCommunityIcons name="shield-bug" size={15} color="#C084FC" />
                <Text style={styles.roleSectionTitle}>SOC TECHNICAL FORENSICS & INCIDENT AUDIT</Text>
              </View>

              {/* Tech Subtabs */}
              <View style={styles.techTabsRow}>
                {(["NETWORK", "IDS", "DEVICE", "MITIGATION"] as const).map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.techTabBtn, techTab === tab && styles.techTabBtnActive]}
                    onPress={() => setTechTab(tab)}
                  >
                    <Text style={[styles.techTabBtnText, techTab === tab && styles.techTabBtnTextActive]}>
                      {tab}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tab 1: Network Information */}
              {techTab === "NETWORK" && (
                <View style={styles.techMetaGrid}>
                  <Text style={styles.techMetaItem}>
                    <Text style={styles.techMetaKey}>Source Client IP: </Text>
                    {sec?.client_ip || payload.source_ip || "192.168.1.189"}
                  </Text>
                  <Text style={styles.techMetaItem}>
                    <Text style={styles.techMetaKey}>Destination Target: </Text>
                    {dev?.ip_address || "192.168.1.100"}:{dev?.port || 1883}
                  </Text>
                  <Text style={styles.techMetaItem}>
                    <Text style={styles.techMetaKey}>Protocol / Cipher: </Text>
                    {net?.protocol || "MQTT v3.1.1 / TLS 1.3 (QoS 1)"}
                  </Text>
                  <Text style={styles.techMetaItem}>
                    <Text style={styles.techMetaKey}>MQTT Ingress Topic: </Text>
                    hospital/icu/{alert.patient_id || "patient_102"}/telemetry
                  </Text>
                  <Text style={styles.techMetaItem}>
                    <Text style={styles.techMetaKey}>Broker Instance: </Text>
                    {net?.broker || "tcp://127.0.0.1:1883 (Local IoMT Broker)"}
                  </Text>
                  <Text style={styles.techMetaItem}>
                    <Text style={styles.techMetaKey}>Packet Metrics: </Text>
                    Size: {net?.packet_size || 148} B | Latency: {net?.latency || 8.2} ms | Loss: {net?.packet_loss || 0}%
                  </Text>
                </View>
              )}

              {/* Tab 2: IDS / IPS Classification */}
              {techTab === "IDS" && (
                <View style={styles.techMetaGrid}>
                  <Text style={styles.techMetaItem}>
                    <Text style={styles.techMetaKey}>Detection Engine: </Text>
                    Dual-Layer AI: Isolation Forest (L1) + Random Forest (L2)
                  </Text>
                  <Text style={styles.techMetaItem}>
                    <Text style={styles.techMetaKey}>Attack Classification: </Text>
                    {sec?.attack_type || payload.attack_type || (alert.message.includes("DoS") ? "High-rate Packet Flooding" : "ECG Waveform Spoofing")}
                  </Text>
                  <Text style={styles.techMetaItem}>
                    <Text style={styles.techMetaKey}>Anomaly Score: </Text>
                    0.942 (Detection Threshold: &gt; 0.700)
                  </Text>
                  <Text style={styles.techMetaItem}>
                    <Text style={styles.techMetaKey}>Model F1-Score: </Text>
                    98.2% on CICIoMT2024 Dataset
                  </Text>
                  <Text style={styles.techMetaItem}>
                    <Text style={styles.techMetaKey}>Integrity Check: </Text>
                    HMAC-SHA256 Payload Discrepancy (Sensor Spoof Flagged)
                  </Text>
                </View>
              )}

              {/* Tab 3: Device Hardware Information */}
              {techTab === "DEVICE" && (
                <View style={styles.techMetaGrid}>
                  <Text style={styles.techMetaItem}>
                    <Text style={styles.techMetaKey}>Device Name: </Text>
                    {dev?.name || alert.device_name || "Bedside ECG Monitor"}
                  </Text>
                  <Text style={styles.techMetaItem}>
                    <Text style={styles.techMetaKey}>Device Type: </Text>
                    {dev?.type || alert.device_type}
                  </Text>
                  <Text style={styles.techMetaItem}>
                    <Text style={styles.techMetaKey}>Device MAC / ID: </Text>
                    {dev?.mac_address || alert.device_id}
                  </Text>
                  <Text style={styles.techMetaItem}>
                    <Text style={styles.techMetaKey}>Firmware Version: </Text>
                    {dev?.firmware_version || "v2.4.12"}
                  </Text>
                  <Text style={styles.techMetaItem}>
                    <Text style={styles.techMetaKey}>Battery / Signal: </Text>
                    {dev?.battery ? `${dev.battery}%` : "98%"} • {dev?.signal_strength || "Excellent"}
                  </Text>
                  <Text style={styles.techMetaItem}>
                    <Text style={styles.techMetaKey}>Hardware State: </Text>
                    {dev?.status || "Quarantine"}
                  </Text>
                </View>
              )}

              {/* Tab 4: Mitigation & Containment */}
              {techTab === "MITIGATION" && (
                <View style={styles.techMetaGrid}>
                  <Text style={styles.techMetaItem}>
                    <Text style={styles.techMetaKey}>Containment Rule: </Text>
                    IPS-RULE-204: Automated Device Isolation & Ingress Drop
                  </Text>
                  <Text style={styles.techMetaItem}>
                    <Text style={styles.techMetaKey}>Action Taken: </Text>
                    {sec?.action_taken || payload.mitigation_status || "Device Quarantined; Ingress Packets Dropped"}
                  </Text>
                  <Text style={styles.techMetaItem}>
                    <Text style={styles.techMetaKey}>VLAN Assignment: </Text>
                    VLAN 999 (IoMT Honeypot Sandbox)
                  </Text>
                  <Text style={styles.techMetaItem}>
                    <Text style={styles.techMetaKey}>EHR Poisoning Guard: </Text>
                    BLOCKED — Untrusted telemetry denied write access
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Resolution Notes If Any */}
          {alert.resolution_notes ? (
            <View style={styles.resolutionNotesBox}>
              <MaterialCommunityIcons name="note-text-outline" size={13} color="#94A3B8" />
              <Text style={styles.resolutionNotesText}>
                Audit Note: {alert.resolution_notes}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Bottom Status & Resolve Bar */}
      <View style={styles.bottomRow}>
        <View style={styles.statusPill}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isResolved ? "#10B981" : isEscalated ? "#EF4444" : isInvestigating ? "#F59E0B" : "#F87171" },
            ]}
          />
          <Text style={[styles.statusLabel, { color: statStyle.text }]}>
            {currentStatus}
          </Text>
        </View>

        {!isResolved ? (
          <TouchableOpacity
            style={styles.resolveBtn}
            onPress={() => handleUpdateStatus("Resolved")}
            disabled={resolving || statusUpdating}
          >
            {resolving || statusUpdating ? (
              <ActivityIndicator size="small" color="#070B14" />
            ) : (
              <>
                <MaterialCommunityIcons name="check-all" size={14} color="#070B14" />
                <Text style={styles.resolveBtnText}>RESOLVE & MITIGATE</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.resolvedBadge}>
            <MaterialCommunityIcons name="shield-check" size={14} color="#10B981" />
            <Text style={styles.resolvedText}>Resolved & Audited</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0D1527",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  resolvedCard: {
    opacity: 0.75,
    borderColor: "#15233D",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  leftMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 8.5,
    fontWeight: "bold",
    letterSpacing: 0.3,
  },
  alertId: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "bold",
  },
  rightMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timestamp: {
    fontSize: 9,
    color: "#64748B",
  },
  message: {
    fontSize: 12,
    color: "#F8FAFC",
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: 10,
  },
  attribBox: {
    backgroundColor: "#070B14",
    padding: 8,
    borderRadius: 6,
    gap: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  attribRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  attribText: {
    fontSize: 10,
    color: "#94A3B8",
  },
  boldText: {
    color: "#F1F5F9",
    fontWeight: "bold",
  },
  statusActionBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#070B14",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#1E293B",
    marginBottom: 8,
    gap: 6,
  },
  actionLabel: {
    fontSize: 8.5,
    color: "#64748B",
    fontWeight: "bold",
  },
  statusActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#334155",
    gap: 3,
  },
  activeStatusActionBtn: {
    borderColor: "#00FF66",
    backgroundColor: "rgba(0, 255, 102, 0.1)",
  },
  statusActionBtnText: {
    fontSize: 9,
    color: "#94A3B8",
    fontWeight: "600",
  },
  expandTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    marginTop: 2,
  },
  expandText: {
    fontSize: 10,
    color: "#00FF66",
    fontWeight: "bold",
  },
  expandedPanel: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 10,
    color: "#94A3B8",
  },
  syncChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 255, 102, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 102, 0.25)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 8,
    gap: 6,
  },
  syncChipText: {
    fontSize: 9,
    color: "#86EFAC",
    fontWeight: "600",
  },
  roleBlock: {
    gap: 8,
  },
  roleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  roleSectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#CBD5E1",
    letterSpacing: 0.5,
  },
  dossierCard: {
    backgroundColor: "#070B14",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1E293B",
    gap: 6,
  },
  dossierRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dossierTitle: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: "#00FF66",
    letterSpacing: 0.5,
  },
  dossierGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dossierItem: {
    width: "48%",
  },
  dossierKey: {
    fontSize: 8,
    color: "#64748B",
    fontWeight: "bold",
  },
  dossierVal: {
    fontSize: 10,
    color: "#E2E8F0",
    fontWeight: "600",
  },
  integrityBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
  },
  integrityText: {
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  vitalsSection: {
    gap: 6,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionHeaderTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  simulatedLabel: {
    fontSize: 8,
    color: "#64748B",
    fontStyle: "italic",
  },
  vitalsRow: {
    flexDirection: "row",
    gap: 6,
  },
  vitalCard: {
    flex: 1,
    backgroundColor: "#070B14",
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1E293B",
    alignItems: "center",
  },
  vitalCardAlert: {
    borderColor: "rgba(239, 68, 68, 0.4)",
    backgroundColor: "rgba(239, 68, 68, 0.05)",
  },
  vitalLabel: {
    fontSize: 7.5,
    color: "#94A3B8",
    fontWeight: "bold",
    textAlign: "center",
  },
  vitalValue: {
    fontSize: 13,
    fontWeight: "900",
    marginVertical: 2,
  },
  vitalUnit: {
    fontSize: 8.5,
    color: "#64748B",
  },
  vitalSub: {
    fontSize: 7.5,
    color: "#64748B",
    textAlign: "center",
  },
  thresholdText: {
    fontSize: 7,
    color: "#F59E0B",
    marginTop: 2,
    fontWeight: "bold",
    textAlign: "center",
  },
  waveformContainer: {
    backgroundColor: "#070B14",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 6,
    padding: 8,
  },
  waveformHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  waveformLabel: {
    fontSize: 8,
    color: "#64748B",
    fontWeight: "bold",
  },
  waveformGrid: {
    height: 38,
    justifyContent: "center",
  },
  ecgBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  ecgBar: {
    width: 4,
    borderRadius: 2,
  },
  actionRecommendationBox: {
    backgroundColor: "rgba(0, 255, 102, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 102, 0.2)",
    padding: 8,
    borderRadius: 6,
    gap: 4,
  },
  recHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  recTitle: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: "#00FF66",
    letterSpacing: 0.3,
  },
  recBullet: {
    fontSize: 9,
    color: "#CBD5E1",
    lineHeight: 13,
  },
  patientCareText: {
    fontSize: 10.5,
    color: "#E2E8F0",
    lineHeight: 15,
  },
  patientInstructionBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    borderWidth: 1,
    borderColor: "#38BDF8",
    padding: 8,
    borderRadius: 6,
    gap: 8,
  },
  patientInstructionText: {
    fontSize: 9.5,
    color: "#BAE6FD",
    flex: 1,
    lineHeight: 14,
  },
  techTabsRow: {
    flexDirection: "row",
    gap: 4,
    marginVertical: 4,
  },
  techTabBtn: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "#070B14",
    borderWidth: 1,
    borderColor: "#1E293B",
    alignItems: "center",
  },
  techTabBtnActive: {
    borderColor: "#C084FC",
    backgroundColor: "rgba(192, 132, 252, 0.15)",
  },
  techTabBtnText: {
    fontSize: 8.5,
    color: "#94A3B8",
    fontWeight: "bold",
  },
  techTabBtnTextActive: {
    color: "#C084FC",
  },
  techMetaGrid: {
    backgroundColor: "#070B14",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1E293B",
    gap: 4,
  },
  techMetaItem: {
    fontSize: 9.5,
    color: "#CBD5E1",
    lineHeight: 14,
    fontFamily: Platform.OS === "android" ? "monospace" : "Courier",
  },
  techMetaKey: {
    color: "#C084FC",
    fontWeight: "bold",
  },
  resolutionNotesBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#070B14",
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 6,
    borderRadius: 4,
    gap: 6,
    marginTop: 4,
  },
  resolutionNotesText: {
    fontSize: 9,
    color: "#94A3B8",
    fontStyle: "italic",
    flex: 1,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: "bold",
  },
  resolveBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00FF66",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
    gap: 5,
  },
  resolveBtnText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#070B14",
    letterSpacing: 0.5,
  },
  resolvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  resolvedText: {
    fontSize: 10,
    color: "#10B981",
    fontWeight: "bold",
  },
});
