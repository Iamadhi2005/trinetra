import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/connection_provider.dart';

class AppHeader extends StatelessWidget {
  final VoidCallback? onSwitchAccount;

  const AppHeader({super.key, this.onSwitchAccount});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final conn = context.watch<ConnectionProvider>();
    final user = auth.currentUser;

    return Container(
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 8,
        left: 16,
        right: 16,
        bottom: 12,
      ),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(
          bottom: BorderSide(color: AppColors.borderSubtle, width: 1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Logo & Title
              Row(
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.primary.withOpacity(0.5), width: 1.5),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(6.5),
                      child: Image.asset(
                        'assets/images/logo.png',
                        width: 34,
                        height: 34,
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "TRINETRA IoMT",
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.2,
                        ),
                      ),
                      Text(
                        "Zero-Trust Hospital Defense v2.4",
                        style: TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 10,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              // Connection Beacon & Account Button
              Row(
                children: [
                  Builder(
                    builder: (context) {
                      Color statusColor;
                      String statusText;
                      IconData? statusIcon;

                      switch (conn.status) {
                        case GatewayStatus.connected:
                          statusColor = AppColors.primary;
                          statusText = "${conn.latencyMs}ms";
                          break;
                        case GatewayStatus.connecting:
                          statusColor = AppColors.cyan;
                          statusText = "CONNECTING";
                          statusIcon = Icons.sync;
                          break;
                        case GatewayStatus.reconnecting:
                          statusColor = AppColors.warning;
                          statusText = "RETRYING (${conn.retryCount})";
                          statusIcon = Icons.refresh;
                          break;
                        case GatewayStatus.authRequired:
                          statusColor = const Color(0xFFA855F7);
                          statusText = "AUTH REQUIRED";
                          statusIcon = Icons.lock_outline;
                          break;
                        case GatewayStatus.offline:
                          statusColor = AppColors.danger;
                          statusText = "OFFLINE";
                          statusIcon = Icons.cloud_off;
                          break;
                      }

                      return Tooltip(
                        message: "Status: ${conn.statusLabel}\nTap to Reconnect Gateway",
                        child: InkWell(
                          onTap: () {
                            conn.manualReconnect();
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text("Reconnecting to gateway (${conn.serverUrl})..."),
                                duration: const Duration(seconds: 2),
                                backgroundColor: AppColors.surfaceElevated,
                              ),
                            );
                          },
                          borderRadius: BorderRadius.circular(20),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: statusColor.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: statusColor, width: 1),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                if (statusIcon != null && (conn.isConnecting || conn.isReconnecting))
                                  Padding(
                                    padding: const EdgeInsets.only(right: 4),
                                    child: SizedBox(
                                      width: 8,
                                      height: 8,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 1.5,
                                        color: statusColor,
                                      ),
                                    ),
                                  )
                                else
                                  Container(
                                    width: 6,
                                    height: 6,
                                    margin: const EdgeInsets.only(right: 5),
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: statusColor,
                                    ),
                                  ),
                                Text(
                                  statusText,
                                  style: TextStyle(
                                    color: statusColor,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                  if (onSwitchAccount != null) ...[
                    const SizedBox(width: 8),
                    IconButton(
                      icon: const Icon(Icons.account_circle_outlined, size: 24, color: AppColors.textSecondary),
                      onPressed: onSwitchAccount,
                      tooltip: "Account Switcher",
                      constraints: const BoxConstraints(),
                      padding: EdgeInsets.zero,
                    ),
                  ],
                ],
              ),
            ],
          ),

          // User Role Chip
          if (user != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.surfaceElevated,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    user.isDoctor
                        ? Icons.medical_services_outlined
                        : user.isAdmin
                            ? Icons.admin_panel_settings_outlined
                            : Icons.security_outlined,
                    size: 13,
                    color: user.isDoctor ? AppColors.primary : AppColors.cyan,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    "${user.name} • ${user.role}${user.department != null ? ' (${user.department})' : ''}",
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
