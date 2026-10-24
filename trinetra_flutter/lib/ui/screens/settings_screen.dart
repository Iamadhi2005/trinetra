import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/constants/app_colors.dart';
import '../../data/models/device_model.dart';
import '../../data/models/user_model.dart';
import '../../data/services/api_service.dart';
import '../../data/services/storage_service.dart';
import '../../providers/auth_provider.dart';
import '../../providers/connection_provider.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _urlController = TextEditingController();
  String _deviceId = "";

  // Admin Data
  List<UserModel> _adminAccounts = [];
  List<DeviceModel> _adminDevices = [];
  bool _loadingAdmin = false;

  // Assign Doctor
  String _assignPatientId = "patient_102";
  String _assignDoctorName = "Dr. Sarah Connor";
  bool _assigning = false;

  @override
  void initState() {
    super.initState();
    final conn = context.read<ConnectionProvider>();
    _urlController.text = conn.serverUrl;
    StorageService.getOrCreateDeviceId().then((id) {
      if (mounted) setState(() => _deviceId = id);
    });

    final auth = context.read<AuthProvider>();
    if (auth.currentUser?.isAdmin == true) {
      _loadAdminData();
    }
  }

  Future<void> _loadAdminData() async {
    setState(() => _loadingAdmin = true);
    try {
      final accs = await ApiService.getAdminAccounts();
      final devs = await ApiService.getAdminDevices();
      if (mounted) {
        setState(() {
          _adminAccounts = accs;
          _adminDevices = devs;
        });
      }
    } catch (_) {} finally {
      if (mounted) setState(() => _loadingAdmin = false);
    }
  }

  Future<void> _handleSaveAndTest() async {
    final conn = context.read<ConnectionProvider>();
    final newUrl = _urlController.text.trim();
    if (newUrl.isNotEmpty) {
      await conn.setServerUrl(newUrl);
    }
  }

  Future<void> _handleAssignDoctor() async {
    setState(() => _assigning = true);
    try {
      await ApiService.assignDoctorToPatient(_assignPatientId, _assignDoctorName);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Assigned $_assignDoctorName to $_assignPatientId"),
            backgroundColor: AppColors.primary,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Assignment error: $e"), backgroundColor: AppColors.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _assigning = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final conn = context.watch<ConnectionProvider>();
    final user = auth.currentUser;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section: Backend Gateway Configuration
          _buildSectionHeader("GATEWAY CONNECTION & TUNNEL"),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderSubtle),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: _urlController,
                  decoration: const InputDecoration(
                    labelText: "TRINETRA Server Gateway URL",
                    prefixIcon: Icon(Icons.link, size: 20, color: AppColors.textMuted),
                  ),
                  style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
                ),
                const SizedBox(height: 10),

                // Presets
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    _presetUrlBtn("Cloud Tunnel", ApiEndpoints.defaultCloudTunnelUrl),
                    _presetUrlBtn("Hospital Wi-Fi", ApiEndpoints.defaultLocalWifiUrl),
                    _presetUrlBtn("Android Emulator", ApiEndpoints.defaultEmulatorUrl),
                  ],
                ),

                const SizedBox(height: 14),

                // Action Buttons: Save & Test + Manual Reconnect Fallback
                Row(
                  children: [
                    Expanded(
                      flex: 3,
                      child: ElevatedButton.icon(
                        icon: conn.isTesting
                            ? const SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.textInverse),
                              )
                            : const Icon(Icons.wifi_tethering, size: 16),
                        label: const Text("SAVE & TEST", style: TextStyle(fontSize: 12)),
                        onPressed: conn.isTesting ? null : _handleSaveAndTest,
                        style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 12)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      flex: 3,
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.refresh, size: 16),
                        label: const Text("RECONNECT", style: TextStyle(fontSize: 12)),
                        onPressed: conn.isTesting ? null : () => conn.manualReconnect(),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          side: const BorderSide(color: AppColors.primary),
                          foregroundColor: AppColors.primary,
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 10),

                // Clear Connection State Box
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceElevated,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: conn.isConnected
                          ? AppColors.primary.withOpacity(0.4)
                          : (conn.isReconnecting || conn.isConnecting)
                              ? AppColors.warning.withOpacity(0.4)
                              : AppColors.danger.withOpacity(0.4),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            conn.isConnected
                                ? Icons.check_circle
                                : (conn.isReconnecting || conn.isConnecting)
                                    ? Icons.sync
                                    : Icons.error_outline,
                            size: 16,
                            color: conn.isConnected
                                ? AppColors.primary
                                : (conn.isReconnecting || conn.isConnecting)
                                    ? AppColors.warning
                                    : AppColors.danger,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            "STATUS: ${conn.statusLabel}",
                            style: TextStyle(
                              color: conn.isConnected
                                  ? AppColors.primary
                                  : (conn.isReconnecting || conn.isConnecting)
                                      ? AppColors.warning
                                      : AppColors.danger,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.8,
                            ),
                          ),
                          const Spacer(),
                          if (conn.isConnected)
                            Text(
                              "${conn.latencyMs} ms",
                              style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                            ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        conn.statusMessage,
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Section: Device Registration Info
          _buildSectionHeader("MOBILE DEVICE IDENTIFIER"),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderSubtle),
            ),
            child: Row(
              children: [
                const Icon(Icons.phone_android, color: AppColors.cyan, size: 28),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Registered Hardware Device UUID",
                        style: TextStyle(color: AppColors.textMuted, fontSize: 10),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _deviceId.isNotEmpty ? _deviceId : "Generating...",
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text(
                    "AUTHORIZED",
                    style: TextStyle(color: AppColors.primary, fontSize: 9, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Section: Administrator Controls (If Admin)
          if (user?.isAdmin == true) ...[
            _buildSectionHeader("HOSPITAL SUPERADMIN CONSOLE"),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.primary.withOpacity(0.4)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    "ASSIGN DOCTOR TO ICU PATIENT",
                    style: TextStyle(color: AppColors.cyan, fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          decoration: const InputDecoration(labelText: "Patient ID (e.g. patient_102)"),
                          controller: TextEditingController(text: _assignPatientId),
                          onChanged: (v) => _assignPatientId = v,
                          style: const TextStyle(fontSize: 12),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          decoration: const InputDecoration(labelText: "Doctor Name"),
                          controller: TextEditingController(text: _assignDoctorName),
                          onChanged: (v) => _assignDoctorName = v,
                          style: const TextStyle(fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      icon: _assigning
                          ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.assignment_ind_outlined, size: 16),
                      label: const Text("UPDATE CLINICAL ROSTER", style: TextStyle(fontSize: 11)),
                      onPressed: _assigning ? null : _handleAssignDoctor,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "ACTIVE HOSPITAL ACCOUNTS",
                        style: TextStyle(color: AppColors.cyan, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                      IconButton(
                        icon: const Icon(Icons.refresh, size: 16, color: AppColors.textMuted),
                        onPressed: _loadAdminData,
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  if (_loadingAdmin)
                    const Center(child: Padding(padding: EdgeInsets.all(8), child: CircularProgressIndicator(color: AppColors.primary)))
                  else
                    ..._adminAccounts.map((acc) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text("${acc.name} (${acc.role})", style: const TextStyle(color: AppColors.textPrimary, fontSize: 11)),
                            Text(acc.isActive ? "ACTIVE" : "DISABLED", style: TextStyle(color: acc.isActive ? AppColors.primary : AppColors.danger, fontSize: 10, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      );
                    }),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],

          // Section: Active Account Profile & Logout
          _buildSectionHeader("ACTIVE SESSION"),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderSubtle),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    const Icon(Icons.account_circle, color: AppColors.primary, size: 36),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user?.name ?? "Authenticated Clinician",
                            style: const TextStyle(color: AppColors.textPrimary, fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            "${user?.role ?? 'Doctor'} • ${user?.department ?? 'Cardiology ICU-A'}",
                            style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.logout, color: AppColors.danger, size: 16),
                    label: const Text("SIGN OUT OF SESSION", style: TextStyle(color: AppColors.danger, fontSize: 12, fontWeight: FontWeight.bold)),
                    onPressed: () => auth.logout(),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.danger),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(
        title,
        style: const TextStyle(
          color: AppColors.textMuted,
          fontSize: 11,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.8,
        ),
      ),
    );
  }

  Widget _presetUrlBtn(String label, String url) {
    return ActionChip(
      label: Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textSecondary)),
      backgroundColor: AppColors.surfaceElevated,
      side: const BorderSide(color: AppColors.borderSubtle),
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
      onPressed: () {
        setState(() => _urlController.text = url);
      },
    );
  }
}
