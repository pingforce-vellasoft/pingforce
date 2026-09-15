import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/error/failures.dart';
import 'package:mobile/features/auth/data/datasources/auth_remote_data_source.dart';
import 'package:mobile/features/auth/data/repositories/auth_repository_impl.dart';

class _MalformedUserRemote implements AuthRemoteDataSource {
  // Parsing fails after token storage has awaited an asynchronous operation.
  Map<String, dynamic> get response => {
    'access_token': 'test-token',
    'user': 'not-a-user-object',
  };

  @override
  Future<Map<String, dynamic>> login(
    String email,
    String password,
    String tenantCode,
  ) async => response;

  @override
  Future<Map<String, dynamic>> signup(String email, String password) async =>
      response;

  @override
  Future<Map<String, dynamic>> googleAuth(String idToken) async => response;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late AuthRepositoryImpl repository;

  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
    repository = AuthRepositoryImpl(
      remoteDataSource: _MalformedUserRemote(),
      secureStorage: const FlutterSecureStorage(),
    );
  });

  test('login catches asynchronous response processing errors', () async {
    final result = await repository.login('staff@example.test', 'test', 'TEST');
    result.fold(
      (failure) => expect(failure, isA<ServerFailure>()),
      (_) => fail('Expected a failure for malformed user data'),
    );
  });

  test('signup catches asynchronous response processing errors', () async {
    final result = await repository.signup('staff@example.test', 'test');
    result.fold(
      (failure) => expect(failure, isA<ServerFailure>()),
      (_) => fail('Expected a failure for malformed user data'),
    );
  });

  test('Google auth catches asynchronous response processing errors', () async {
    final result = await repository.googleAuth('test-id-token');
    result.fold(
      (failure) => expect(failure, isA<ServerFailure>()),
      (_) => fail('Expected a failure for malformed user data'),
    );
  });
}
