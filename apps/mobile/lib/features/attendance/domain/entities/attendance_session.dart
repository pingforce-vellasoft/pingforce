import 'package:equatable/equatable.dart';

class AttendanceSession extends Equatable {
  final String id;
  final String employeeId;
  final DateTime punchIn;
  final DateTime? punchOut;
  final String status;
  final String attendanceMethod;

  const AttendanceSession({
    required this.id,
    required this.employeeId,
    required this.punchIn,
    this.punchOut,
    required this.status,
    required this.attendanceMethod,
  });

  @override
  List<Object?> get props => [id, employeeId, punchIn, punchOut, status, attendanceMethod];
}
