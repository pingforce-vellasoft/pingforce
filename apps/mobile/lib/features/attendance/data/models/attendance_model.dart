import '../../domain/entities/attendance_session.dart';

class AttendanceModel extends AttendanceSession {
  const AttendanceModel({
    required super.id,
    required super.employeeId,
    required super.punchIn,
    super.punchOut,
    required super.status,
    required super.attendanceMethod,
  });

  factory AttendanceModel.fromJson(Map<String, dynamic> json) {
    return AttendanceModel(
      id: json['id'],
      employeeId: json['employeeId'],
      punchIn: DateTime.parse(json['punchIn']),
      punchOut: json['punchOut'] != null ? DateTime.parse(json['punchOut']) : null,
      status: json['status'] ?? 'PRESENT',
      attendanceMethod: json['attendanceMethod'] ?? 'GPS',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'employeeId': employeeId,
      'punchIn': punchIn.toIso8601String(),
      'punchOut': punchOut?.toIso8601String(),
      'status': status,
      'attendanceMethod': attendanceMethod,
    };
  }
}
