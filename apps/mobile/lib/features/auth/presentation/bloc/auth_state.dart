import 'package:equatable/equatable.dart';
import '../../domain/entities/user.dart';

abstract class AuthState extends Equatable {
  final User? user;
  const AuthState({this.user});

  @override
  List<Object?> get props => [user];
}

class AuthInitial extends AuthState {}

class AuthLoading extends AuthState {
  const AuthLoading({super.user});
}

class Authenticated extends AuthState {
  const Authenticated(User user) : super(user: user);
}

class Unauthenticated extends AuthState {}

class AuthError extends AuthState {
  final String message;
  const AuthError(this.message, {super.user});

  @override
  List<Object?> get props => [message, user];
}
