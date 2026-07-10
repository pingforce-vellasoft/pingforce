import 'package:flutter_bloc/flutter_bloc.dart';
import 'attendance_event.dart';
import 'attendance_state.dart';
import '../../domain/usecases/punch_command.dart';
import '../../domain/usecases/register_device_command.dart';

class AttendanceBloc extends Bloc<AttendanceEvent, AttendanceState> {
  final PunchCommand punchCommand;
  final RegisterDeviceCommand registerDeviceCommand;

  AttendanceBloc({
    required this.punchCommand,
    required this.registerDeviceCommand,
  }) : super(AttendanceInitial()) {
    
    on<RegisterDeviceEvent>((event, emit) async {
      emit(AttendanceLoading());
      final result = await registerDeviceCommand(
        RegisterDeviceParams(publicKey: event.publicKey),
      );
      result.fold(
        (failure) => emit(AttendanceError(message: failure.message)),
        (_) => emit(DeviceRegisteredSuccess()),
      );
    });

    on<PunchEvent>((event, emit) async {
      emit(AttendanceLoading());
      final result = await punchCommand(
        PunchParams(
          latitude: event.latitude,
          longitude: event.longitude,
          cryptographicSignature: event.cryptographicSignature,
        ),
      );
      result.fold(
        (failure) => emit(AttendanceError(message: failure.message)),
        (session) => emit(AttendanceSuccess(session: session)),
      );
    });
  }
}
