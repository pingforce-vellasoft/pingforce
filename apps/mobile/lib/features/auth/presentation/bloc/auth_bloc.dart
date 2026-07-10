import 'package:flutter_bloc/flutter_bloc.dart';
import 'auth_event.dart';
import 'auth_state.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/usecases/login_command.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final LoginCommand loginCommand;
  final AuthRepository authRepository;

  AuthBloc({
    required this.loginCommand,
    required this.authRepository,
  }) : super(AuthInitial()) {
    
    on<CheckAuthStatus>((event, emit) async {
      emit(AuthLoading());
      final result = await authRepository.getCachedUser();
      result.fold(
        (failure) => emit(Unauthenticated()),
        (user) {
          if (user != null) {
            emit(Authenticated(user));
          } else {
            emit(Unauthenticated());
          }
        },
      );
    });

    on<LoginRequested>((event, emit) async {
      emit(AuthLoading());
      final result = await loginCommand(
        LoginParams(email: event.email, password: event.password),
      );
      result.fold(
        (failure) => emit(AuthError(failure.message)),
        (user) => emit(Authenticated(user)),
      );
    });

    on<LogoutRequested>((event, emit) async {
      emit(AuthLoading());
      await authRepository.logout();
      emit(Unauthenticated());
    });
  }
}
