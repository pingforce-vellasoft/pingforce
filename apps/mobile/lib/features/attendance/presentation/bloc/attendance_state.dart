import 'package:equatable/equatable.dart';
import '../../domain/entities/attendance_session.dart';

abstract class AttendanceState extends Equatable {
  const AttendanceState();

  @override
  List<Object> get props => [];
}

class AttendanceInitial extends AttendanceState {}

class AttendanceLoading extends AttendanceState {}

class AttendanceSuccess extends AttendanceState {
  final AttendanceSession session;
  const AttendanceSuccess({required this.session});
  
  @override
  List<Object> get props => [session];
}

class DeviceRegisteredSuccess extends AttendanceState {}

class AttendanceError extends AttendanceState {
  final String message;
  const AttendanceError({required this.message});
  
  @override
  List<Object> get props => [message];
}
