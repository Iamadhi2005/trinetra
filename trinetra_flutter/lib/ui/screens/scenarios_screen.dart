import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/attack_scenarios.dart';
import '../../providers/scenarios_provider.dart';
import '../../providers/vitals_provider.dart';
import '../widgets/scenario_card.dart';

class ScenariosScreen extends StatefulWidget {
  const ScenariosScreen({super.key});

  @override
  State<ScenariosScreen> createState() => _ScenariosScreenState();
}

class _ScenariosScreenState extends State<ScenariosScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ScenariosProvider>().init();
    });
  }

  @override
  Widget build(BuildContext context) {
    final scenariosProv = context.watch<ScenariosProvider>();
    final vitalsProv = context.watch<VitalsProvider>();

    final isAttacking = scenariosProv.isAttacking;
    final currentMode = scenariosProv.attackState.attackMode;

    return SingleChildScrollView(
      padding: const EdgeInsets.only(bottom: 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Target Selection Header
          Padding(
            padding: const EdgeInsets.only(left: 16, right: 16, top: 12, bottom: 6),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.track_changes_outlined, size: 16, color: AppColors.cyan),
                    SizedBox(width: 6),
                    Text(
                      "TARGET ICU PATIENT NODE",
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
                  "FOCUS: ${vitalsProv.selectedPatientId}",
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 10),
                ),
              ],
            ),
          ),

          // Horizontal patient selection pills
          SizedBox(
            height: 48,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: vitalsProv.patients.length,
              itemBuilder: (context, index) {
                final patient = vitalsProv.patients[index];
                final isSelected = patient.id == vitalsProv.selectedPatientId;

                return GestureDetector(
                  onTap: () => vitalsProv.selectPatient(patient.id),
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.cyan.withOpacity(0.15) : AppColors.surface,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: isSelected ? AppColors.cyan : AppColors.borderSubtle,
                        width: isSelected ? 1.5 : 1,
                      ),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      "${patient.name} (${patient.id})",
                      style: TextStyle(
                        color: isSelected ? AppColors.cyan : AppColors.textSecondary,
                        fontSize: 11,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          const SizedBox(height: 8),

          // Active Attack HUD / Emergency Disengage Button
          if (isAttacking) ...[
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.dangerDim,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.danger, width: 2),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.danger.withOpacity(0.35),
                    blurRadius: 18,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.warning_amber_rounded, color: AppColors.danger, size: 24),
                          const SizedBox(width: 8),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "ACTIVE EXPLOIT: $currentMode",
                                style: const TextStyle(
                                  color: AppColors.textPrimary,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0.8,
                                ),
                              ),
                              Text(
                                "Target: ${vitalsProv.selectedPatientId} • Zero-Trust IPS Engaged",
                                style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 10),
                              ),
                            ],
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.4),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          "${scenariosProv.elapsedSeconds}s",
                          style: const TextStyle(
                            color: AppColors.danger,
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      icon: scenariosProv.isLoading
                          ? const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.textInverse),
                            )
                          : const Icon(Icons.power_settings_new),
                      label: const Text(
                        "DISENGAGE ALL • RESTORE NORMAL SINUS",
                        style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.8),
                      ),
                      onPressed: scenariosProv.isLoading
                          ? null
                          : () async {
                              await scenariosProv.disengageAll();
                              vitalsProv.updateAttackStatus(false, "Normal");
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: Colors.red.shade900,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],

          // Section Title: Scenarios List
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Text(
              "AVAILABLE RED-TEAM EXPLOIT PROFILES",
              style: TextStyle(
                color: AppColors.textMuted,
                fontSize: 11,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.8,
              ),
            ),
          ),

          // Scenarios Cards
          ...AttackScenarios.list.map((scenario) {
            final isThisScenarioActive = isAttacking && currentMode == scenario.mode;

            return ScenarioCard(
              scenario: scenario,
              isActive: isThisScenarioActive,
              isLoading: scenariosProv.isLoading && currentMode == scenario.mode,
              onTrigger: () async {
                if (isThisScenarioActive) {
                  await scenariosProv.disengageAll();
                  vitalsProv.updateAttackStatus(false, "Normal");
                } else {
                  final ok = await scenariosProv.triggerScenario(
                    scenario.mode,
                    vitalsProv.selectedPatientId,
                  );
                  if (ok) {
                    vitalsProv.updateAttackStatus(true, scenario.mode);
                  }
                }
              },
            );
          }),
        ],
      ),
    );
  }
}
