import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import 'ecg_waveform_painter.dart';

class VitalsCard extends StatelessWidget {
  final bool isAttacking;
  final int ecgPhase;
  final int heartRate;
  final int spo2;
  final String bloodPressure;
  final int respiratoryRate;
  final String infusionRate;
  final double temperature;
  final int battery;
  final String pumpStatus;
  final String machineName;

  const VitalsCard({
    super.key,
    required this.isAttacking,
    required this.ecgPhase,
    required this.heartRate,
    required this.spo2,
    required this.bloodPressure,
    required this.respiratoryRate,
    required this.infusionRate,
    this.temperature = 37.0,
    this.battery = 98,
    this.pumpStatus = "Pumping Normal",
    this.machineName = "ICU Bedside Monitor",
  });

  String _calculateMap(String bp) {
    try {
      final parts = bp.split('/');
      if (parts.length == 2) {
        final sys = int.parse(parts[0].trim());
        final dia = int.parse(parts[1].trim());
        final map = dia + ((sys - dia) / 3).round();
        return "MAP $map";
      }
    } catch (_) {}
    return "MAP --";
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = isAttacking ? AppColors.danger : AppColors.primary;
    final mapStr = _calculateMap(bloodPressure);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isAttacking ? AppColors.danger.withOpacity(0.5) : AppColors.borderSubtle,
          width: isAttacking ? 1.5 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Row(
            children: [
              Icon(Icons.monitor_heart_outlined, color: statusColor, size: 22),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "CONTINUOUS CLINICAL TELEMETRY",
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.8,
                      ),
                    ),
                    Text(
                      "$machineName • Lead II ECG • Real Hemodynamics",
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 10),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: statusColor, width: 1),
                ),
                child: Text(
                  isAttacking ? "ANOMALY FLAGGED" : "NORMAL SINUS",
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 10),

          // Zero-Trust Data Integrity Banner
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
            decoration: BoxDecoration(
              color: isAttacking
                  ? AppColors.danger.withOpacity(0.12)
                  : AppColors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: isAttacking ? AppColors.danger : AppColors.primary,
                width: 1,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  isAttacking ? Icons.gpp_bad_outlined : Icons.verified_user_outlined,
                  size: 16,
                  color: isAttacking ? AppColors.danger : AppColors.primary,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    isAttacking
                        ? "DATA INTEGRITY: UNTRUSTED • SENSOR PACKETS ALTERED"
                        : "DATA INTEGRITY: ZERO-TRUST VERIFIED • CRYPTOGRAPHIC SHA-256 VALID",
                    style: TextStyle(
                      color: isAttacking ? const Color(0xFFFCA5A5) : const Color(0xFF86EFAC),
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.4,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // ECG Strip Header Info
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: statusColor,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    "LEAD II (II) • 25 mm/s • 10 mm/mV",
                    style: TextStyle(
                      color: AppColors.textPrimary.withOpacity(0.9),
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
              Text(
                "HR: $heartRate BPM",
                style: TextStyle(
                  color: statusColor,
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),

          // Animated Lead II ECG Waveform Canvas
          Container(
            height: 95,
            width: double.infinity,
            decoration: BoxDecoration(
              color: const Color(0xFF070B13),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.borderSubtle),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: CustomPaint(
                painter: EcgWaveformPainter(
                  phase: ecgPhase,
                  isAttacking: isAttacking,
                  traceColor: statusColor,
                  heartRate: heartRate,
                ),
              ),
            ),
          ),

          const SizedBox(height: 12),

          // Primary Real Vitals Grid: HR, SpO2, Real BP (with MAP)
          Row(
            children: [
              _buildVitalBox("HEART RATE", "$heartRate", "BPM", statusColor, subtitle: heartRate > 100 ? "TACHY" : (heartRate < 60 ? "BRADY" : "SINUS")),
              const SizedBox(width: 8),
              _buildVitalBox("SpO₂ OXYGEN", "$spo2", "%", spo2 < 92 ? AppColors.danger : AppColors.primary, subtitle: spo2 < 90 ? "HYPOXIA" : "OPTIMAL"),
              const SizedBox(width: 8),
              _buildVitalBox("BLOOD PRESSURE", bloodPressure, "mmHg", isAttacking ? AppColors.danger : AppColors.cyan, subtitle: mapStr),
            ],
          ),
          const SizedBox(height: 8),

          // Secondary Clinical Parameters: Temp, Resp, Infusion, Battery
          Row(
            children: [
              _buildVitalBox("TEMP", "${temperature.toStringAsFixed(1)}", "°C", temperature > 38.0 ? AppColors.danger : AppColors.warning),
              const SizedBox(width: 8),
              _buildVitalBox("RESPIRATION", "$respiratoryRate", "/min", isAttacking ? AppColors.danger : AppColors.textPrimary),
              const SizedBox(width: 8),
              _buildVitalBox("INFUSION PUMP", infusionRate, "", isAttacking ? AppColors.danger : AppColors.textPrimary, subtitle: pumpStatus),
              const SizedBox(width: 8),
              _buildVitalBox("BATTERY", "$battery", "%", battery < 20 ? AppColors.danger : AppColors.primary, subtitle: "IoMT Node"),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildVitalBox(
    String label,
    String value,
    String unit,
    Color color, {
    String? subtitle,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
        decoration: BoxDecoration(
          color: AppColors.surfaceElevated,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.borderSubtle),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: const TextStyle(
                color: AppColors.textMuted,
                fontSize: 8.5,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.4,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 3),
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Flexible(
                  child: Text(
                    value,
                    style: TextStyle(
                      color: color,
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (unit.isNotEmpty) ...[
                  const SizedBox(width: 2),
                  Text(
                    unit,
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 8.5,
                    ),
                  ),
                ],
              ],
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: TextStyle(
                  color: subtitle.contains("TACHY") || subtitle.contains("HYPOXIA") || subtitle.contains("BRADY")
                      ? AppColors.danger
                      : AppColors.textMuted,
                  fontSize: 8,
                  fontWeight: FontWeight.w600,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
