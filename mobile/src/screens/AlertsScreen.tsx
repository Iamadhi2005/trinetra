import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Alert } from "../types";
import { AlertItem } from "../components/AlertItem";

interface AlertsScreenProps {
  alerts: Alert[];
  onRefresh: () => void;
  refreshing: boolean;
  onResolveAlert: (id: number) => void;
  resolvingId: number | null;
}

export const AlertsScreen: React.FC<AlertsScreenProps> = ({
  alerts,
  onRefresh,
  refreshing,
  onResolveAlert,
  resolvingId,
}) => {
  const [filter, setFilter] = useState<string>("ALL");

  const filteredAlerts = alerts.filter((a) => {
    if (filter === "ALL") return true;
    if (filter === "UNRESOLVED") return a.status === "Unresolved";
    if (filter === "RESOLVED") return a.status === "Resolved";
    return a.severity?.toUpperCase() === filter;
  });

  const unresolvedCount = alerts.filter((a) => a.status === "Unresolved").length;

  return (
    <View style={styles.container}>
      {/* Summary Banner */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>LIVE IDS DETECTION ALERTS</Text>
          <Text style={styles.headerSub}>
            Real-time telemetry anomaly and signature flags
          </Text>
        </View>

        <View style={styles.counterBadge}>
          <Text style={styles.counterNumber}>{unresolvedCount}</Text>
          <Text style={styles.counterText}>UNRESOLVED</Text>
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {["ALL", "UNRESOLVED", "CRITICAL", "HIGH", "RESOLVED"].map((f) => {
          const isSelected = filter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, isSelected && styles.selectedChip]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[
                  styles.filterText,
                  isSelected && styles.selectedFilterText,
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Alert Feed */}
      <FlatList
        data={filteredAlerts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <AlertItem
            alert={item}
            onResolve={onResolveAlert}
            resolving={resolvingId === item.id}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00FF66"
            colors={["#00FF66"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={48}
              color="#334155"
            />
            <Text style={styles.emptyTitle}>No Alerts Recorded</Text>
            <Text style={styles.emptyDesc}>
              {filter === "ALL"
                ? "The IDS has not flagged any anomalous telemetry payloads yet."
                : `No alerts found matching filter: ${filter}`}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070B14",
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#F8FAFC",
    letterSpacing: 0.8,
  },
  headerSub: {
    fontSize: 9,
    color: "#64748B",
    marginTop: 2,
  },
  counterBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "#EF4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: "center",
  },
  counterNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#F87171",
  },
  counterText: {
    fontSize: 8,
    color: "#FCA5A5",
    fontWeight: "bold",
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  filterChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#0D1527",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  selectedChip: {
    backgroundColor: "rgba(0, 255, 102, 0.15)",
    borderColor: "#00FF66",
  },
  filterText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#64748B",
  },
  selectedFilterText: {
    color: "#00FF66",
  },
  listContent: {
    padding: 14,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#64748B",
  },
  emptyDesc: {
    fontSize: 11,
    color: "#475569",
    textAlign: "center",
    maxWidth: 240,
  },
});
