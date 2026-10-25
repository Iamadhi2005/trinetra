import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'core/theme/app_theme.dart';
import 'data/services/notification_service.dart';
import 'data/services/power_service.dart';
import 'data/services/storage_service.dart';
import 'providers/alerts_provider.dart';
import 'providers/auth_provider.dart';
import 'providers/connection_provider.dart';
import 'providers/scenarios_provider.dart';
import 'providers/vitals_provider.dart';
import 'ui/screens/home_nav_screen.dart';
import 'ui/screens/login_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Set system UI overlay style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Color(0xFF121826),
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  // Initialize persistent storage, power wake lock, and notification channels
  await StorageService.init();
  await NotificationService.init();
  await PowerService.init();

  runApp(const TrinetraApp());
}

class TrinetraApp extends StatelessWidget {
  const TrinetraApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ConnectionProvider()..init()),
        ChangeNotifierProvider(create: (_) => AuthProvider()..init()),
        ChangeNotifierProvider(create: (_) => AlertsProvider()..init()),
        ChangeNotifierProxyProvider<AlertsProvider, VitalsProvider>(
          create: (_) => VitalsProvider()..init(),
          update: (_, alerts, vitals) {
            final v = vitals ?? (VitalsProvider()..init());
            v.onAttackDetected = (pid, type, sev, msg) {
              alerts.handleActiveAttack(
                attackMode: type,
                attackType: type,
                patientId: pid,
                severity: sev,
                message: msg,
              );
            };
            return v;
          },
        ),
        ChangeNotifierProvider(create: (_) => ScenariosProvider()),
      ],
      child: MaterialApp(
        title: 'TRINETRA IoMT Console',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        home: const AuthGate(),
      ),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    if (!auth.initialized) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: Color(0xFF00FF66)),
        ),
      );
    }

    if (auth.isAuthenticated) {
      return const HomeNavScreen();
    }

    return const LoginScreen();
  }
}
