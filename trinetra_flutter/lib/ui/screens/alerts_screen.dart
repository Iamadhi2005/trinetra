import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../providers/alerts_provider.dart';
import '../../providers/vitals_provider.dart';
import '../widgets/alert_card.dart';
import '../widgets/alert_detail_modal.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  int _activeSubTab = 0; // 0 = Alerts, 1 = Delivery Audit

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AlertsProvider>().init();
    });
  }

  void _showTestNotificationDialog(BuildContext context) {
    final alertsProv = context.read<AlertsProvider>();
    final vitalsProv = context.read<VitalsProvider>();

    showDialog(
      context: context,
      builder: (ctx) {
        String testResult = "";
        bool dispatching = false;

        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: AppColors.surface,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              title: const Text(
                "DISPATCH TEST ALARM",
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.8,
                ),
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    "Simulate high-priority push notification across device operating states:",
                    style: TextStyle(color: AppColors.textSecondary, fontSize: 11),
                  ),
                  const SizedBox(height: 12),
                  _testSimBtn(
                    "1. Foreground Audible Siren",
                    "Triggers in-app banner & audio siren",
                    dispatching,
                    () async {
                      setDialogState(() => dispatching = true);
                      final res = await alertsProv.dispatchTestNotification("FOREGROUND", patientId: vitalsProv.selectedPatientId);
                      setDialogState(() {
                        dispatching = false;
                        testResult = res;
                      });
                    },
                  ),
                  const SizedBox(height: 8),
                  _testSimBtn(
                    "2. Background Push Channel",
                    "Dispatches FCM payload to channel",
                    dispatching,
                    () async {
                      setDialogState(() => dispatching = true);
                      final res = await alertsProv.dispatchTestNotification("BACKGROUND", patientId: vitalsProv.selectedPatientId);
                      setDialogState(() {
                        dispatching = false;
                        testResult = res;
                      });
                    },
                  ),
                  const SizedBox(height: 8),
                  _testSimBtn(
                    "3. Lock-Screen (Privacy Redacted)",
                    "Wakes lock-screen with masked vitals",
                    dispatching,
                    () async {
                      setDialogState(() => dispatching = true);
                      final res = await alertsProv.dispatchTestNotification("SCREEN_OFF", patientId: vitalsProv.selectedPatientId);
                      setDialogState(() {
                        dispatching = false;
                        testResult = res;
                      });
                    },
                  ),
                  if (testResult.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.primaryDim.withOpacity(0.4),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: AppColors.primary.withOpacity(0.5)),
                      ),
                      child: Text(
                        testResult,
                        style: const TextStyle(color: AppColors.primary, fontSize: 10),
                      ),
                    ),
                  ],
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text("CLOSE", style: TextStyle(color: AppColors.textMuted)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _testSimBtn(String title, String desc, bool loading, VoidCallback onTap) {
    return InkWell(
      onTap: loading ? null : onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.surfaceElevated,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.borderSubtle),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(color: AppColors.textPrimary, fontSize: 11, fontWeight: FontWeight.bold)),
            const SizedBox(height: 2),
            Text(desc, style: const TextStyle(color: AppColors.textMuted, fontSize: 9)),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final alertsProv = context.watch<AlertsProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          // Sub-Tab Switcher & Test Action
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.borderSubtle),
                    ),
                    child: Row(
                      children: [
                        _subTabItem("ACTIVE ALERTS", 0),
                        _subTabItem("DELIVERY AUDIT", 1),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.notification_add_outlined, color: AppColors.cyan, size: 22),
                  onPressed: () => _showTestNotificationDialog(context),
                  tooltip: "Simulate Push Alarm",
                  style: IconButton.styleFrom(
                    backgroundColor: AppColors.surface,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                      side: const BorderSide(color: AppColors.borderSubtle),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Filters row (Only in ACTIVE ALERTS view)
          if (_activeSubTab == 0)
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Row(
                children: [
                  _filterChip("ALL", alertsProv.activeFilter == 'ALL', alertsProv),
                  _filterChip("CRITICAL", alertsProv.activeFilter == 'CRITICAL', alertsProv),
                  _filterChip("HIGH", alertsProv.activeFilter == 'HIGH', alertsProv),
                  _filterChip("WARNING", alertsProv.activeFilter == 'WARNING', alertsProv),
                  _filterChip("RESOLVED", alertsProv.activeFilter == 'RESOLVED', alertsProv),
                ],
              ),
            ),

          const SizedBox(height: 6),

          // Main Content List
          Expanded(
            child: _activeSubTab == 0
                ? _buildAlertsList(alertsProv)
                : _buildAuditLogsList(alertsProv),
          ),
        ],
      ),
    );
  }

  Widget _subTabItem(String label, int index) {
    final isSelected = _activeSubTab == index;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() => _activeSubTab = index);
          if (index == 1) {
            context.read<AlertsProvider>().loadAuditLogs();
          }
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.surfaceElevated : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? AppColors.primary : AppColors.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
            ),
          ),
        ),
      ),
    );
  }

  Widget _filterChip(String label, bool isSelected, AlertsProvider prov) {
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: FilterChip(
        label: Text(label, style: TextStyle(fontSize: 10, color: isSelected ? AppColors.textInverse : AppColors.textSecondary)),
        selected: isSelected,
        selectedColor: AppColors.primary,
        backgroundColor: AppColors.surface,
        side: const BorderSide(color: AppColors.borderSubtle),
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
        onSelected: (_) => prov.setFilter(label),
      ),
    );
  }

  Widget _buildAlertsList(AlertsProvider prov) {
    if (prov.isLoading && prov.alerts.isEmpty) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primary));
    }

    if (prov.alerts.isEmpty) {
      return RefreshIndicator(
        color: AppColors.primary,
        onRefresh: prov.loadAlerts,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: const [
            SizedBox(height: 80),
            Center(
              child: Column(
                children: [
                  Icon(Icons.check_circle_outline, size: 48, color: AppColors.primary),
                  SizedBox(height: 12),
                  Text("No alarms matching filter", style: TextStyle(color: AppColors.textPrimary, fontSize: 14, fontWeight: FontWeight.bold)),
                  SizedBox(height: 4),
                  Text("All bedside IoMT monitors operating within safe clinical bounds.", style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: prov.loadAlerts,
      child: ListView.builder(
        padding: const EdgeInsets.only(bottom: 24),
        itemCount: prov.alerts.length,
        itemBuilder: (context, index) {
          final alert = prov.alerts[index];
          return AlertCard(
            alert: alert,
            isResolving: prov.resolvingId == alert.id,
            onInspect: () async {
              await prov.inspectAlert(alert.id);
              if (mounted && prov.selectedAlertDetail != null) {
                showModalBottomSheet(
                  context: context,
                  isScrollControlled: true,
                  backgroundColor: Colors.transparent,
                  builder: (ctx) => AlertDetailModal(
                    detail: prov.selectedAlertDetail!,
                    isResolving: prov.resolvingId == alert.id,
                    onClose: () => Navigator.pop(ctx),
                    onResolve: () async {
                      await prov.resolveAlert(alert.id);
                      if (mounted) Navigator.pop(ctx);
                    },
                  ),
                );
              }
            },
            onResolve: () => prov.resolveAlert(alert.id),
          );
        },
      ),
    );
  }

  Widget _buildAuditLogsList(AlertsProvider prov) {
    if (prov.isLoadingAuditLogs && prov.auditLogs.isEmpty) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primary));
    }

    if (prov.auditLogs.isEmpty) {
      return RefreshIndicator(
        color: AppColors.primary,
        onRefresh: prov.loadAuditLogs,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: const [
            SizedBox(height: 80),
            Center(
              child: Text("No notification delivery audit records available.", style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: prov.loadAuditLogs,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: prov.auditLogs.length,
        itemBuilder: (context, index) {
          final log = prov.auditLogs[index];
          final bool delivered = log['delivery_status'] == 'DELIVERED';

          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.borderSubtle),
            ),
            child: Row(
              children: [
                Icon(
                  delivered ? Icons.done_all : Icons.schedule,
                  size: 20,
                  color: delivered ? AppColors.primary : AppColors.warning,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        log['title']?.toString() ?? "Medical Alert Push",
                        style: const TextStyle(color: AppColors.textPrimary, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        "Target: ${log['target_role']} • ${log['patient_id']}",
                        style: const TextStyle(color: AppColors.textMuted, fontSize: 10),
                      ),
                    ],
                  ),
                ),
                Text(
                  Formatters.formatTimestamp(log['timestamp']),
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 9),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
