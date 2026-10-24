import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/attack_scenarios.dart';

class ScenarioCard extends StatelessWidget {
  final AttackScenarioItem scenario;
  final bool isActive;
  final bool isLoading;
  final VoidCallback onTrigger;

  const ScenarioCard({
    super.key,
    required this.scenario,
    required this.isActive,
    required this.isLoading,
    required this.onTrigger,
  });

  @override
  Widget build(BuildContext context) {
    Color sevColor;
    switch (scenario.severity) {
      case 'CRITICAL':
        sevColor = AppColors.danger;
        break;
      case 'HIGH':
        sevColor = AppColors.warning;
        break;
      case 'WARNING':
        sevColor = const Color(0xFFFBBF24);
        break;
      default:
        sevColor = AppColors.cyan;
        break;
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isActive ? sevColor : AppColors.borderSubtle,
          width: isActive ? 2 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row: Category & Severity Tag
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                scenario.category.toUpperCase(),
                style: const TextStyle(
                  color: AppColors.cyan,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: sevColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: sevColor, width: 1),
                ),
                child: Text(
                  scenario.severity,
                  style: TextStyle(
                    color: sevColor,
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 8),

          // Scenario Title
          Text(
            scenario.label,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),

          const SizedBox(height: 4),

          // Target
          Text(
            "Target: ${scenario.target}",
            style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
          ),

          const SizedBox(height: 8),

          // Payload Effect Box
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.surfaceElevated,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              scenario.payloadEffect,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 11,
                height: 1.3,
              ),
            ),
          ),

          const SizedBox(height: 12),

          // Trigger / Active status button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              icon: isLoading
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.textInverse),
                    )
                  : Icon(
                      isActive ? Icons.bolt : Icons.play_arrow_outlined,
                      size: 16,
                      color: isActive ? Colors.white : AppColors.textInverse,
                    ),
              label: Text(
                isActive ? "ACTIVE SIMULATION RUNNING" : "INJECT EXPLOIT SCENARIO",
                style: TextStyle(
                  fontSize: 11,
                  color: isActive ? Colors.white : AppColors.textInverse,
                  fontWeight: FontWeight.bold,
                ),
              ),
              onPressed: isLoading ? null : onTrigger,
              style: ElevatedButton.styleFrom(
                backgroundColor: isActive ? sevColor : AppColors.primary,
                padding: const EdgeInsets.symmetric(vertical: 10),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
