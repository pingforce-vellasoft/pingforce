import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../injection_container.dart';
import '../domain/entities/user.dart';
import '../domain/repositories/auth_repository.dart';

/// The signed-in user restored from the secure `user_cache` (written at login).
/// Exposes the auto-generated workspace ID (`tenantCode`) for the dashboard.
final currentUserProvider = FutureProvider<User?>((ref) async {
  final result = await sl<AuthRepository>().getCachedUser();
  return result.fold((_) => null, (user) => user);
});
