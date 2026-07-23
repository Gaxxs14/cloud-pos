import 'package:flutter/material.dart';
import 'services/api_service.dart';
import 'screens/login_screen.dart';
import 'screens/admin_dashboard_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ApiService.init();
  runApp(const CloudPosAdminNativeApp());
}

class CloudPosAdminNativeApp extends StatelessWidget {
  const CloudPosAdminNativeApp({super.key});

  @override
  Widget build(BuildContext context) {
    final isLoggedIn = ApiService.token != null && ApiService.token!.isNotEmpty;

    return MaterialApp(
      title: 'Cloud POS Admin',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0F172A),
          primary: const Color(0xFF0F172A),
        ),
        useMaterial3: true,
      ),
      home: isLoggedIn ? const AdminDashboardScreen() : const AdminLoginScreen(),
    );
  }
}
