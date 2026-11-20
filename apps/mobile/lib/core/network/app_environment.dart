/// Compile with --dart-define=PINGFORCE_ENV=qa for the isolated QA backend.
class AppEnvironment {
  static const name = String.fromEnvironment('PINGFORCE_ENV', defaultValue: 'production');
  static bool get isQa => name == 'qa';
  static const _qaUrl = String.fromEnvironment('QA_API_URL', defaultValue: 'https://qa.pingforce.com');
  static String get baseUrl {
    if (name != 'qa' && name != 'production') {
      throw StateError('Unknown PINGFORCE_ENV: $name');
    }
    if (!isQa) return 'https://api.pingforce.in';
    if (!const ['https://qa.pingforce.com', 'http://127.0.0.1:4300', 'http://localhost:4300'].contains(_qaUrl)) {
      throw StateError('QA_API_URL must use the QA host or local port 4300');
    }
    return _qaUrl;
  }
}
