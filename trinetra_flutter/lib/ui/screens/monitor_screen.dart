import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/scenarios_provider.dart';
import '../../providers/vitals_provider.dart';
import '../widgets/quarantine_queue_card.dart';
import '../widgets/terminal_log_view.dart';
import '../widgets/vitals_card.dart';

class MonitorScreen extends StatefulWidget {
  const MonitorScreen({super.key});

  @override
  State<MonitorScreen> createState() => _MonitorScreenState();
}

class _MonitorScreenState extends State<MonitorScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<VitalsProvider>().init();
    });
  }

  Future<void> _handleRefresh() async {
    final vitals = context.read<VitalsProvider>();
    await Future.wait([
      vitals.loadPatients(),
      vitals.loadQuarantineQueue(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final vitals = context.watch<VitalsProvider>();
    final scenarios = context.watch<ScenariosProvider>();

    final isAttacking = scenarios.isAttacking || vitals.isAttacking;

    return RefreshIndicator(
      color: AppColors.primary,
      backgroundColor: AppColors.surface,
      onRefresh: _handleRefresh,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Patient Node Selector Carousel
            Padding(
              padding: const EdgeInsets.only(left: 16, right: 16, top: 12, bottom: 6),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.people_outline, size: 16, color: AppColors.primary),
                      const SizedBox(width: 6),
                      const Text(
                        "TARGET ICU PATIENT MONITOR",
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ],
                  ),
                  Text(
                    "${vitals.patients.length} BEDS MONITORED",
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 10),
                  ),
                ],
              ),
            ),

            SizedBox(
              height: 60,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                itemCount: vitals.patients.length,
                itemBuilder: (context, index) {
                  final patient = vitals.patients[index];
                  final isSelected = patient.id == vitals.selectedPatientId;

                  return GestureDetector(
                    onTap: () => vitals.selectPatient(patient.id),
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.primaryDim : AppColors.surface,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isSelected ? AppColors.primary : AppColors.borderSubtle,
                          width: isSelected ? 1.5 : 1,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Row(
                            children: [
                              Text(
                                patient.name,
                                style: TextStyle(
                                  color: isSelected ? AppColors.primary : AppColors.textPrimary,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              if (isSelected && isAttacking) ...[
                                const SizedBox(width: 6),
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: const BoxDecoration(
                                    color: AppColors.danger,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            "${patient.id} • Bed ${patient.bedNumber ?? '01'}",
                            style: TextStyle(
                              color: isSelected ? AppColors.primary.withOpacity(0.8) : AppColors.textMuted,
                              fontSize: 10,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),

            const SizedBox(height: 4),

            // Continuous Clinical Telemetry & Vitals Card
            VitalsCard(
              isAttacking: isAttacking,
              ecgPhase: vitals.ecgPhase,
              heartRate: vitals.heartRate,
              spo2: vitals.spo2,
              bloodPressure: vitals.bloodPressure,
              respiratoryRate: vitals.respiratoryRate,
              infusionRate: vitals.infusionRate,
              temperature: vitals.temperature,
              battery: vitals.battery,
              pumpStatus: vitals.pumpStatus,
              machineName: vitals.machineName,
            ),

            // Incident Console Terminal Logs
            TerminalLogView(
              logs: vitals.logs,
              onClear: vitals.clearLogs,
            ),

            // Zero-Trust Device Quarantine Queue
            QuarantineQueueCard(
              items: vitals.quarantineQueue,
              isLoading: vitals.isLoadingQuarantine,
              onRefresh: vitals.loadQuarantineQueue,
            ),
          ],
        ),
      ),
    );
  }
}
