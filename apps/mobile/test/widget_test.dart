import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/injection_container.dart' as di;
import 'package:mobile/main.dart';

void main() {
  setUpAll(() async {
    await di.init();
  });

  testWidgets('App boots and renders the splash screen', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: PingForceApp()));
    await tester.pump();

    // The router starts at /splash, so a MaterialApp must be mounted.
    expect(find.byType(MaterialApp), findsOneWidget);

    // Let the splash screen's navigation timers elapse, then dispose the
    // tree so periodic UI timers are cancelled before teardown.
    await tester.pump(const Duration(seconds: 10));
    await tester.pump(const Duration(seconds: 10));
    await tester.pumpWidget(const SizedBox.shrink());
  });
}
