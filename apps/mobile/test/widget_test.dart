import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('Foundation test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const PingForceApp());

    // Verify that our base UI renders
    expect(find.text('PingForce Foundation Ready'), findsOneWidget);
  });
}
