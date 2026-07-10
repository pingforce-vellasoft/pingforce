import 'package:flutter_bloc/flutter_bloc.dart';
import 'auth_event.dart';
import 'auth_state.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/usecases/login_command.dart';
import '../../domain/usecases/signup_command.dart';
import '../../domain/usecases/google_auth_command.dart';
import 'package:google_sign_in/google_sign_in.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final LoginCommand loginCommand;
  final SignupCommand signupCommand;
  final GoogleAuthCommand googleAuthCommand;
  final AuthRepository authRepository;
  final GoogleSignIn _googleSignIn = GoogleSignIn();

  AuthBloc({
    required this.loginCommand,
    required this.signupCommand,
    required this.googleAuthCommand,
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
      final result = await loginCommand(LoginParams(email: event.email, password: event.password));
      result.fold(
        (failure) => emit(AuthError(failure.message)),
        (user) => emit(Authenticated(user)),
      );
    });

    on<SignupRequested>((event, emit) async {
      emit(AuthLoading());
      final result = await signupCommand(SignupParams(
        firstName: event.firstName,
        lastName: event.lastName,
        email: event.email,
        password: event.password,
      ));
      result.fold(
        (failure) => emit(AuthError(failure.message)),
        (user) => emit(Authenticated(user)),
      );
    });

    on<GoogleSignInRequested>((event, emit) async {
      emit(AuthLoading());
      try {
        final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
        if (googleUser == null) {
          emit(const AuthError('Google Sign In was aborted.'));
          return;
        }

        final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
        final String? idToken = googleAuth.idToken;

        if (idToken == null) {
          emit(const AuthError('Failed to get Google Identity Token.'));
          return;
        }

        final result = await googleAuthCommand(idToken);
        result.fold(
          (failure) => emit(AuthError(failure.message)),
          (user) => emit(Authenticated(user)),
        );
      } catch (e) {
        emit(AuthError('Google Sign In failed: ${e.toString()}'));
      }
    });

    on<LogoutRequested>((event, emit) async {
      emit(AuthLoading());
      await authRepository.logout();
      emit(Unauthenticated());
    });
  }
}
