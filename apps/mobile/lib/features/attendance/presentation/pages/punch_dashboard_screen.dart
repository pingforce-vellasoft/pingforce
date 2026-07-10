import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/hardware/hardware_service.dart';
import '../../../../injection_container.dart';
import '../bloc/attendance_bloc.dart';
import '../bloc/attendance_event.dart';
import '../bloc/attendance_state.dart';

class PunchDashboardScreen extends StatefulWidget {
  const PunchDashboardScreen({super.key});

  @override
  State<PunchDashboardScreen> createState() => _PunchDashboardScreenState();
}

class _PunchDashboardScreenState extends State<PunchDashboardScreen> {
  bool _isProcessingHardware = false;

  Future<void> _handlePunch() async {
    setState(() {
      _isProcessingHardware = true;
    });

    try {
      final hardwareService = sl<HardwareService>();
      
      // 1. Biometric Verification
      final isAuthenticated = await hardwareService.authenticateUser(
        'Please verify your identity to log attendance.',
      );

      if (!isAuthenticated) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Authentication failed or cancelled.'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
        setState(() {
          _isProcessingHardware = false;
        });
        return;
      }

      // 2. Fetch Live GPS Coordinates
      final position = await hardwareService.getCurrentLocation();

      if (!mounted) return;
      // 3. Dispatch Event with Real Data
      context.read<AttendanceBloc>().add(
        PunchEvent(
          latitude: position.latitude,
          longitude: position.longitude,
          cryptographicSignature: 'device_verified_${DateTime.now().millisecondsSinceEpoch}',
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Hardware Error: ${e.toString()}'),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isProcessingHardware = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('PingForce Field Staff'),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: BlocConsumer<AttendanceBloc, AttendanceState>(
        listener: (context, state) {
          if (state is AttendanceError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: Theme.of(context).colorScheme.error,
              ),
            );
          } else if (state is AttendanceSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Attendance Logged Successfully!'),
                backgroundColor: Colors.green,
              ),
            );
          }
        },
        builder: (context, state) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Glassmorphism Card
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(32),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surface.withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.1),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.2),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        const Icon(
                          Icons.fingerprint,
                          size: 80,
                          color: Color(0xFF6366F1),
                        ),
                        const SizedBox(height: 24),
                        const Text(
                          'Ready to Check-in',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Hardware secured. Location required.',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.white.withValues(alpha: 0.6),
                          ),
                        ),
                        const SizedBox(height: 40),
                        
                        // Action Button
                        if (state is AttendanceLoading || _isProcessingHardware)
                          const CircularProgressIndicator()
                        else
                          ElevatedButton(
                            onPressed: _handlePunch,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF6366F1),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 48,
                                vertical: 16,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                              elevation: 8,
                            ),
                            child: const Text(
                              'LOG ATTENDANCE',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 1.5,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
