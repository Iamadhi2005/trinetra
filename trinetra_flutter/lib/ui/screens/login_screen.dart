import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/connection_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController(text: 'dr.connor');
  final _passwordController = TextEditingController(text: 'DoctorInit2026!');
  bool _obscurePassword = true;
  String? _error;

  void _fillPreset(String user, String pass) {
    setState(() {
      _usernameController.text = user;
      _passwordController.text = pass;
      _error = null;
    });
  }

  Future<void> _handleLogin() async {
    final auth = context.read<AuthProvider>();
    final username = _usernameController.text.trim();
    final password = _passwordController.text.trim();

    if (username.isEmpty || password.isEmpty) {
      setState(() => _error = "Please enter both username and password");
      return;
    }

    setState(() => _error = null);
    final success = await auth.login(username, password);
    if (!success && mounted) {
      setState(() => _error = auth.errorMessage ?? "Invalid username or password");
    }
  }

  void _showGatewayDialog(BuildContext context) {
    final conn = context.read<ConnectionProvider>();
    final controller = TextEditingController(text: conn.serverUrl);

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
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
              const Text(
                "CONFIGURE GATEWAY ENDPOINT",
                style: TextStyle(
                  color: AppColors.primary,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                "Select Hospital Wi-Fi for direct zero-latency connection, or Cloud Tunnel for 4G/5G mobile data.",
                style: TextStyle(color: AppColors.textMuted, fontSize: 11),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: controller,
                decoration: const InputDecoration(
                  labelText: "Server URL",
                  prefixIcon: Icon(Icons.link, size: 20),
                ),
                style: const TextStyle(fontSize: 13),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  ActionChip(
                    avatar: const Icon(Icons.cloud_done, size: 14, color: AppColors.primary),
                    label: const Text("☁️ Render Cloud (24/7 Live)", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                    backgroundColor: AppColors.primaryDim,
                    side: const BorderSide(color: AppColors.primary),
                    onPressed: () => controller.text = ApiEndpoints.defaultProductionCloudUrl,
                  ),
                  ActionChip(
                    label: const Text("🚀 Tailscale Mesh", style: TextStyle(fontSize: 10)),
                    backgroundColor: AppColors.surfaceElevated,
                    side: const BorderSide(color: AppColors.borderSubtle),
                    onPressed: () => controller.text = ApiEndpoints.defaultTailscaleUrl,
                  ),
                  ActionChip(
                    label: const Text("🏥 Wi-Fi LAN", style: TextStyle(fontSize: 10)),
                    backgroundColor: AppColors.surfaceElevated,
                    side: const BorderSide(color: AppColors.borderSubtle),
                    onPressed: () => controller.text = ApiEndpoints.defaultLocalWifiUrl,
                  ),
                  ActionChip(
                    label: const Text("Cloud Tunnel (loca.lt)", style: TextStyle(fontSize: 10)),
                    backgroundColor: AppColors.surfaceElevated,
                    side: const BorderSide(color: AppColors.borderSubtle),
                    onPressed: () => controller.text = ApiEndpoints.defaultCloudTunnelUrl,
                  ),
                ],
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.check, size: 16),
                  label: const Text("SAVE & CONNECT"),
                  onPressed: () async {
                    Navigator.pop(ctx);
                    await conn.setServerUrl(controller.text.trim());
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final conn = context.watch<ConnectionProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Official TRINETRA Website Logo
                Container(
                  width: 84,
                  height: 84,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withOpacity(0.35),
                        blurRadius: 24,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: ClipOval(
                    child: Image.asset(
                      'assets/images/logo.png',
                      width: 84,
                      height: 84,
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                const Text(
                  "TRINETRA IoMT",
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  "Zero-Trust Clinical Defense Console",
                  style: TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 12,
                    letterSpacing: 0.5,
                  ),
                ),

                const SizedBox(height: 28),

                // Gateway Target Chip (Tappable to change URL)
                GestureDetector(
                  onTap: () => _showGatewayDialog(context),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceElevated,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: conn.isConnected ? AppColors.primary.withOpacity(0.5) : AppColors.danger.withOpacity(0.5)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          conn.isConnected ? Icons.cloud_done_outlined : Icons.cloud_off_outlined,
                          size: 14,
                          color: conn.isConnected ? AppColors.primary : AppColors.danger,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          conn.serverUrl,
                          style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                        ),
                        const SizedBox(width: 6),
                        const Icon(Icons.edit, size: 12, color: AppColors.textMuted),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 10),

                // Fast One-Tap Gateway Switcher
                Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    ChoiceChip(
                      avatar: const Icon(Icons.cloud_done, size: 14, color: AppColors.primary),
                      label: const Text("☁️ Cloud (24/7 Live)", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                      selected: conn.serverUrl.contains("onrender.com"),
                      selectedColor: AppColors.primaryDim,
                      backgroundColor: AppColors.surfaceElevated,
                      side: BorderSide(
                        color: conn.serverUrl.contains("onrender.com") ? AppColors.primary : AppColors.borderSubtle,
                      ),
                      onSelected: (_) => conn.setServerUrl(ApiEndpoints.defaultProductionCloudUrl),
                    ),
                    ChoiceChip(
                      avatar: const Icon(Icons.bolt, size: 14, color: AppColors.primary),
                      label: const Text("Tailscale", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                      selected: conn.serverUrl.contains("100.86."),
                      selectedColor: AppColors.primaryDim,
                      backgroundColor: AppColors.surfaceElevated,
                      side: BorderSide(
                        color: conn.serverUrl.contains("100.86.") ? AppColors.primary : AppColors.borderSubtle,
                      ),
                      onSelected: (_) => conn.setServerUrl(ApiEndpoints.defaultTailscaleUrl),
                    ),
                    ChoiceChip(
                      label: const Text("🏥 Wi-Fi LAN", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                      selected: conn.serverUrl.contains("192.168.") || conn.serverUrl.contains("10.244."),
                      selectedColor: AppColors.primaryDim,
                      backgroundColor: AppColors.surfaceElevated,
                      side: BorderSide(
                        color: (conn.serverUrl.contains("192.168.") || conn.serverUrl.contains("10.244.")) ? AppColors.primary : AppColors.borderSubtle,
                      ),
                      onSelected: (_) => conn.setServerUrl(ApiEndpoints.defaultLocalWifiUrl),
                    ),
                  ],
                ),

                const SizedBox(height: 20),

                // Error Banner
                if (_error != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.danger.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.danger),
                    ),
                    child: Text(
                      _error!,
                      style: const TextStyle(color: AppColors.danger, fontSize: 11),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Credentials Inputs
                TextField(
                  controller: _usernameController,
                  decoration: const InputDecoration(
                    labelText: "Hospital Username",
                    prefixIcon: Icon(Icons.person_outline, size: 20, color: AppColors.textMuted),
                  ),
                  style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    labelText: "Security Password",
                    prefixIcon: const Icon(Icons.lock_outline, size: 20, color: AppColors.textMuted),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                        size: 18,
                        color: AppColors.textMuted,
                      ),
                      onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                    ),
                  ),
                  style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
                ),

                const SizedBox(height: 20),

                // Submit Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: auth.isLoading ? null : _handleLogin,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: auth.isLoading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.textInverse),
                          )
                        : const Text(
                            "AUTHENTICATE SESSION",
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, letterSpacing: 1),
                          ),
                  ),
                ),

                const SizedBox(height: 24),

                // Quick Demo Preset Accounts
                const Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    "QUICK-FILL CLINICAL ROLES",
                    style: TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.8,
                    ),
                  ),
                ),
                const SizedBox(height: 8),

                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    _presetChip("Dr. Radhi", "dr.radhi", "DoctorInit2026!"),
                    _presetChip("Dr. Sarah Connor", "dr.connor", "DoctorInit2026!"),
                    _presetChip("SOC Security Tech", "tech.batman", "TechSec2026!"),
                    _presetChip("Hospital Admin", "admin", "admin123"),
                    _presetChip("Critical Care Nurse", "nurse", "nurse123"),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _presetChip(String label, String u, String p) {
    return ActionChip(
      label: Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textSecondary)),
      backgroundColor: AppColors.surfaceElevated,
      side: const BorderSide(color: AppColors.borderSubtle),
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
      onPressed: () => _fillPreset(u, p),
    );
  }
}
