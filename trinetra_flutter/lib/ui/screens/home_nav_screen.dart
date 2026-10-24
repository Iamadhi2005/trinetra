import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/alerts_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/connection_provider.dart';
import '../widgets/app_header.dart';
import '../widgets/in_app_banner.dart';
import 'alerts_screen.dart';
import 'monitor_screen.dart';
import 'scenarios_screen.dart';
import 'settings_screen.dart';

class HomeNavScreen extends StatefulWidget {
  const HomeNavScreen({super.key});

  @override
  State<HomeNavScreen> createState() => _HomeNavScreenState();
}

class _HomeNavScreenState extends State<HomeNavScreen> with WidgetsBindingObserver {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      context.read<ConnectionProvider>().onAppResumed();
    }
  }

  final List<Widget> _screens = const [
    MonitorScreen(),
    AlertsScreen(),
    ScenariosScreen(),
    SettingsScreen(),
  ];

  void _showAccountSwitcher(BuildContext context) {
    final auth = context.read<AuthProvider>();

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(20),
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
                "SWITCH CLINICAL / SECURITY ACCOUNT",
                style: TextStyle(
                  color: AppColors.primary,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.8,
                ),
              ),
              const SizedBox(height: 12),
              _accountOption(ctx, auth, "Dr. Sarah Connor", "dr.connor", "DoctorInit2026!", "Doctor (Cardiology ICU-A)", Icons.medical_services_outlined),
              _accountOption(ctx, auth, "Dr. Radhi", "dr.radhi", "DoctorInit2026!", "Doctor (Lead Intensivist)", Icons.medical_services_outlined),
              _accountOption(ctx, auth, "SOC Tech Security", "tech.security", "TechSec2026!", "Security Operations Tech", Icons.security_outlined),
              _accountOption(ctx, auth, "Hospital Superadmin", "admin", "AdminPass2026!", "Hospital System Administrator", Icons.admin_panel_settings_outlined),
              const SizedBox(height: 10),
            ],
          ),
        );
      },
    );
  }

  Widget _accountOption(
    BuildContext ctx,
    AuthProvider auth,
    String name,
    String username,
    String password,
    String roleDesc,
    IconData icon,
  ) {
    final isCurrent = auth.currentUser?.username == username;

    return ListTile(
      leading: Icon(icon, color: isCurrent ? AppColors.primary : AppColors.textMuted),
      title: Text(
        name,
        style: TextStyle(
          color: isCurrent ? AppColors.primary : AppColors.textPrimary,
          fontSize: 13,
          fontWeight: isCurrent ? FontWeight.bold : FontWeight.w500,
        ),
      ),
      subtitle: Text(roleDesc, style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
      trailing: isCurrent ? const Icon(Icons.check, color: AppColors.primary, size: 18) : null,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      tileColor: isCurrent ? AppColors.surfaceElevated : Colors.transparent,
      onTap: () async {
        Navigator.pop(ctx);
        if (!isCurrent) {
          await auth.login(username, password);
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final alertsProv = context.watch<AlertsProvider>();
    final unresolvedCount = alertsProv.unresolvedCount;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          Column(
            children: [
              AppHeader(
                onSwitchAccount: () => _showAccountSwitcher(context),
              ),
              Expanded(
                child: IndexedStack(
                  index: _currentIndex,
                  children: _screens,
                ),
              ),
            ],
          ),

          // In-App Alarm Slide-Down Banner
          InAppBanner(
            isVisible: alertsProv.isBannerVisible,
            title: alertsProv.bannerTitle,
            body: alertsProv.bannerBody,
            severity: alertsProv.bannerSeverity,
            onDismiss: alertsProv.dismissBanner,
          ),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: [
          const BottomNavigationBarItem(
            icon: Icon(Icons.monitor_heart_outlined),
            activeIcon: Icon(Icons.monitor_heart),
            label: "MONITOR",
          ),
          BottomNavigationBarItem(
            icon: Badge(
              isLabelVisible: unresolvedCount > 0,
              label: Text("$unresolvedCount"),
              backgroundColor: AppColors.danger,
              child: const Icon(Icons.notifications_active_outlined),
            ),
            activeIcon: Badge(
              isLabelVisible: unresolvedCount > 0,
              label: Text("$unresolvedCount"),
              backgroundColor: AppColors.danger,
              child: const Icon(Icons.notifications_active),
            ),
            label: "ALERTS",
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.bolt_outlined),
            activeIcon: Icon(Icons.bolt),
            label: "SCENARIOS",
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.settings_outlined),
            activeIcon: Icon(Icons.settings),
            label: "SETTINGS",
          ),
        ],
      ),
    );
  }
}
