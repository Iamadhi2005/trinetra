import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../data/models/log_entry_model.dart';

class TerminalLogView extends StatelessWidget {
  final List<LogEntryModel> logs;
  final VoidCallback onClear;

  const TerminalLogView({
    super.key,
    required this.logs,
    required this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF070B13),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.terminal_outlined, color: AppColors.cyan, size: 16),
                  const SizedBox(width: 8),
                  const Text(
                    "ZERO-TRUST INCIDENT TERMINAL",
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.8,
                    ),
                  ),
                ],
              ),
              InkWell(
                onTap: onClear,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                  child: Text(
                    "CLEAR",
                    style: TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            height: 140,
            width: double.infinity,
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFF04060A),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.borderSubtle.withOpacity(0.5)),
            ),
            child: logs.isEmpty
                ? const Center(
                    child: Text(
                      "No security incidents logged. Gateway quiet.",
                      style: TextStyle(color: AppColors.textMuted, fontSize: 11),
                    ),
                  )
                : ListView.builder(
                    itemCount: logs.length,
                    itemBuilder: (context, index) {
                      final item = logs[index];
                      Color msgColor;
                      switch (item.type) {
                        case 'exploit':
                          msgColor = AppColors.danger;
                          break;
                        case 'defense':
                          msgColor = AppColors.primary;
                          break;
                        case 'error':
                          msgColor = AppColors.warning;
                          break;
                        case 'info':
                        default:
                          msgColor = AppColors.cyan;
                          break;
                      }

                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 2),
                        child: Text.rich(
                          TextSpan(
                            children: [
                              TextSpan(
                                text: "[${item.timestamp}] ",
                                style: const TextStyle(
                                  color: AppColors.textMuted,
                                  fontSize: 10,
                                  fontFamily: 'monospace',
                                ),
                              ),
                              TextSpan(
                                text: item.message,
                                style: TextStyle(
                                  color: msgColor,
                                  fontSize: 10,
                                  fontFamily: 'monospace',
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
