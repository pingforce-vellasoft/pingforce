import 'package:flutter/material.dart';
import '../../../attendance/presentation/pages/punch_dashboard_screen.dart';
import '../../../tenant_dashboard/presentation/pages/tenant_dashboard_screen.dart';

class ManagerHybridScreen extends StatefulWidget {
  const ManagerHybridScreen({super.key});

  @override
  State<ManagerHybridScreen> createState() => _ManagerHybridScreenState();
}

class _ManagerHybridScreenState extends State<ManagerHybridScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = [
    const PunchDashboardScreen(),
    const TenantDashboardScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        backgroundColor: const Color(0xFF0F172A),
        selectedItemColor: const Color(0xFF6366F1),
        unselectedItemColor: Colors.white70,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.access_time),
            label: 'My Attendance',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard),
            label: 'Workspace',
          ),
        ],
      ),
    );
  }
}
