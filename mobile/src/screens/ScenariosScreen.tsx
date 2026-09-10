import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert as RNAlert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Patient, AttackState } from "../types";
import { ATTACK_SCENARIOS } from "../constants/scenarios";
import { ScenarioCard } from "../components/ScenarioCard";

interface ScenariosScreenProps {
  patients: Patient[];
  selectedPatient: string;
  onSelectPatient: (id: string) => void;
  attackState: AttackState;
  onTriggerScenario: (mode: string) => void;
  onDisengageAll: () => void;
  loading: boolean;
  onRefreshPatients: () => void;
}

export const ScenariosScreen: React.FC<ScenariosScreenProps> = ({
  patients,
  selectedPatient,
  onSelectPatient,
  attackState,
  onTriggerScenario,
  onDisengageAll,
  loading,
  onRefreshPatients,
}) => {
  const currentMode = attackState.attack_mode || "Normal";
  const isAttacking = currentMode !== "Normal";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Target Selection Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <MaterialCommunityIcons name="account-multiple-outline" size={16} color="#00FF66" />
          <Text style={styles.sectionTitle}>TARGET ICU PATIENT NODE</Text>
        </View>
        <TouchableOpacity onPress={onRefreshPatients} style={styles.refreshBtn}>
          <MaterialCommunityIcons name="refresh" size={14} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Patient Selector Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.patientScroll}
        contentContainerStyle={styles.patientList}
      >
        {patients.map((p) => {
          const isSelected = selectedPatient === p.id;
          const isTargeted =
            attackState.target_patient === p.id && isAttacking;

          return (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.patientPill,
                isSelected && styles.selectedPill,
                isTargeted && styles.targetedPill,
              ]}
              onPress={() => onSelectPatient(p.id)}
              activeOpacity={0.7}
            >
              <View style={styles.pillTop}>
                <Text
                  style={[
                    styles.patientName,
                    isSelected && styles.selectedPatientName,
                    isTargeted && styles.targetedPatientName,
                  ]}
                >
                  {p.name}
                </Text>
                {isTargeted && (
                  <View style={styles.pulseDot} />
                )}
              </View>
              <Text style={styles.patientMeta}>
                {p.id} • Ward {p.ward_number || "ICU"}-{p.bed_number || "01"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Emergency Disengage Big Button */}
      {isAttacking && (
        <TouchableOpacity
          style={styles.emergencyBtn}
          onPress={onDisengageAll}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="shield-alert-outline" size={20} color="#FFFFFF" />
          <View>
            <Text style={styles.emergencyBtnTitle}>EMERGENCY DISENGAGE ALL</Text>
            <Text style={styles.emergencyBtnSub}>
              Halt test exploit • Restore physiological telemetry to normal
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Scenarios Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <MaterialCommunityIcons name="bug-outline" size={16} color="#EF4444" />
          <Text style={styles.sectionTitle}>SYNTHETIC SECURITY TEST SCENARIOS</Text>
        </View>
        <Text style={styles.sectionBadge}>Table 6 Suite</Text>
      </View>

      {/* Scenario Cards */}
      {ATTACK_SCENARIOS.map((scenario) => {
        const isActive = currentMode === scenario.mode;
        return (
          <ScenarioCard
            key={scenario.mode}
            scenario={scenario}
            isActive={isActive}
            onToggle={onTriggerScenario}
            loading={loading}
            selectedPatient={selectedPatient}
          />
        );
      })}
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
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#E2E8F0",
    letterSpacing: 0.8,
  },
  refreshBtn: {
    padding: 4,
  },
  sectionBadge: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  patientScroll: {
    marginBottom: 14,
  },
  patientList: {
    gap: 8,
    paddingVertical: 2,
  },
  patientPill: {
    backgroundColor: "#0D1527",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 130,
  },
  selectedPill: {
    borderColor: "#00FF66",
    backgroundColor: "rgba(0, 255, 102, 0.08)",
  },
  targetedPill: {
    borderColor: "#EF4444",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  pillTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  patientName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#F1F5F9",
  },
  selectedPatientName: {
    color: "#00FF66",
  },
  targetedPatientName: {
    color: "#EF4444",
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EF4444",
  },
  patientMeta: {
    fontSize: 9,
    color: "#64748B",
    marginTop: 2,
  },
  emergencyBtn: {
    backgroundColor: "#DC2626",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    shadowColor: "#EF4444",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  emergencyBtnTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  emergencyBtnSub: {
    fontSize: 9,
    color: "#FEE2E2",
  },
});
