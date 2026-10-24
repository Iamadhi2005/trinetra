import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/alert_model.dart';

class AlertCard extends StatelessWidget {
  final AlertModel alert;
  final VoidCallback onInspect;
  final VoidCallback onResolve;
  final bool isResolving;

  const AlertCard({
    super.key,
    required this.alert,
    required this.onInspect,
    required this.onResolve,
    this.isResolving = false,
  });

  @override
  Widget build(BuildContext context) {
    Color sevColor;
    if (alert.isCritical) {
      sevColor = AppColors.danger;
    } else if (alert.isHigh) {
      sevColor = AppColors.warning;
    } else if (alert.isWarning) {
      sevColor = const Color(0xFFFBBF24);
    } else {
      sevColor = AppColors.cyan;
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: alert.isCritical ? AppColors.danger.withOpacity(0.4) : AppColors.borderSubtle,
          width: alert.isCritical ? 1.5 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Row: Severity Tag & Status Tag
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: sevColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: sevColor, width: 1),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      alert.isCritical ? Icons.warning_amber_rounded : Icons.info_outline,
                      size: 12,
                      color: sevColor,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      alert.severity.toUpperCase(),
                      style: TextStyle(
                        color: sevColor,
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
              Row(
                children: [
                  Text(
                    Formatters.formatTimestamp(alert.timestamp),
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 10),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: alert.isResolved
                          ? AppColors.primary.withOpacity(0.1)
                          : AppColors.warning.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      alert.status.toUpperCase(),
                      style: TextStyle(
                        color: alert.isResolved ? AppColors.primary : AppColors.warning,
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 10),

          // Alert Message / Anomaly Description
          Text(
            alert.message,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 13,
              fontWeight: FontWeight.w700,
              height: 1.3,
            ),
          ),

          const SizedBox(height: 8),

          // Metadata row: Patient & Compromised Device
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.surfaceElevated,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Row(
                    children: [
                      const Icon(Icons.person_outline, size: 14, color: AppColors.cyan),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          "${alert.patientName} (${alert.patientId})",
                          style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Row(
                    children: [
                      const Icon(Icons.devices_other, size: 14, color: AppColors.textMuted),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          alert.deviceName,
                          style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // Action Buttons: Inspect & Resolve
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              OutlinedButton.icon(
                icon: const Icon(Icons.troubleshoot_outlined, size: 14),
                label: const Text("INSPECT", style: TextStyle(fontSize: 11)),
                onPressed: onInspect,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  visualDensity: VisualDensity.compact,
                ),
              ),
              if (!alert.isResolved) ...[
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  icon: isResolving
                      ? const SizedBox(
                          width: 12,
                          height: 12,
                          child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.textInverse),
                        )
                      : const Icon(Icons.check_circle_outline, size: 14),
                  label: const Text("RESOLVE", style: TextStyle(fontSize: 11)),
                  onPressed: isResolving ? null : onResolve,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    visualDensity: VisualDensity.compact,
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
