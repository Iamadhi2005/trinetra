import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class InAppBanner extends StatelessWidget {
  final bool isVisible;
  final String title;
  final String body;
  final String severity;
  final VoidCallback onDismiss;

  const InAppBanner({
    super.key,
    required this.isVisible,
    required this.title,
    required this.body,
    required this.severity,
    required this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    if (!isVisible) return const SizedBox.shrink();

    Color bannerColor = severity.toLowerCase() == 'critical'
        ? AppColors.danger
        : AppColors.warning;

    return Positioned(
      top: MediaQuery.of(context).padding.top + 8,
      left: 12,
      right: 12,
      child: Material(
        color: Colors.transparent,
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF1E1010),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: bannerColor, width: 1.5),
            boxShadow: [
              BoxShadow(
                color: bannerColor.withOpacity(0.35),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.emergency_outlined, color: bannerColor, size: 26),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        color: bannerColor,
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      body,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 11,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close, size: 18, color: AppColors.textMuted),
                onPressed: onDismiss,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
