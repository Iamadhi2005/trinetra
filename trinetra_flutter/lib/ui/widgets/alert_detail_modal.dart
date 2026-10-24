import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../data/models/alert_model.dart';

class AlertDetailModal extends StatelessWidget {
  final AlertDetailModel detail;
  final VoidCallback onClose;
  final VoidCallback onResolve;
  final bool isResolving;

  const AlertDetailModal({
    super.key,
    required this.detail,
    required this.onClose,
    required this.onResolve,
    this.isResolving = false,
  });

  @override
  Widget build(BuildContext context) {
    final alert = detail.alert;
    final patient = detail.patient;
    final device = detail.device;
    final securityEvent = detail.securityEvent;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Modal Handle Bar
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Title & Close
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "SECURITY INCIDENT #${alert.id}",
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1.0,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        alert.message,
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: AppColors.textMuted),
                  onPressed: onClose,
                ),
              ],
            ),

            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 8),

            // Two-Tier ML IDS Classification
            _buildSectionTitle("AI-IDS TWO-TIER ML CLASSIFICATION"),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.surfaceElevated,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Column(
                children: [
                  _buildDetailRow("Attack Type:", securityEvent?['attack_type']?.toString() ?? alert.severity),
                  _buildDetailRow("IDS Detection Layer:", alert.isCritical ? "Layer 1 (Isolation Forest) + Layer 2 (Random Forest)" : "Layer 2 (CIC-IoMT-2024 Random Forest)"),
                  _buildDetailRow("Mitigation Action:", securityEvent?['action_taken']?.toString() ?? "Autonomous Zero-Trust IPS Cutoff & Telemetry Blackholing"),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Compromised Device Specs
            _buildSectionTitle("HARDWARE SPECIFICATIONS & ZERO-TRUST STATUS"),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.surfaceElevated,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Column(
                children: [
                  _buildDetailRow("Device Name:", device?['name']?.toString() ?? alert.deviceName),
                  _buildDetailRow("Hardware MAC:", device?['mac_address']?.toString() ?? "00:1B:44:11:3A:B7"),
                  _buildDetailRow("Gateway IP Address:", device?['ip_address']?.toString() ?? "192.168.1.104"),
                  _buildDetailRow("Firmware Version:", device?['firmware_version']?.toString() ?? "v3.1.2-sec"),
                  _buildDetailRow("Signal Strength / RSSI:", device?['signal_strength']?.toString() ?? "-54 dBm"),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Patient Context
            _buildSectionTitle("PATIENT CLINICAL CONTEXT"),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.surfaceElevated,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Column(
                children: [
                  _buildDetailRow("Patient Name:", alert.patientName),
                  _buildDetailRow("Patient ID:", alert.patientId),
                  _buildDetailRow("Ward Location:", "Ward ${patient?['ward_number'] ?? 'ICU-A'} • Bed ${patient?['bed_number'] ?? '01'}"),
                  _buildDetailRow("Attending Physician:", patient?['doctor_assigned']?.toString() ?? "Dr. Sarah Connor"),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Resolve Action
            if (!alert.isResolved)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  icon: isResolving
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.textInverse),
                        )
                      : const Icon(Icons.check_circle_outline),
                  label: const Text("RESOLVE INCIDENT & UNQUARANTINE"),
                  onPressed: isResolving ? null : onResolve,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
            const SizedBox(height: 10),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        title,
        style: const TextStyle(
          color: AppColors.cyan,
          fontSize: 11,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.8,
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(
              label,
              style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
