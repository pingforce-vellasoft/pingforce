import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/network/app_environment.dart';

void main() {
  test('build environment selects the isolated API origin', () {
    const qaUrl = String.fromEnvironment('QA_API_URL', defaultValue: 'https://qa.pingforce.com');
    expect(AppEnvironment.baseUrl,
        AppEnvironment.isQa ? qaUrl : 'https://api.pingforce.in');
  });
}
