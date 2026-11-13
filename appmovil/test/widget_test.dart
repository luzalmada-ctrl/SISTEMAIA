import 'package:flutter_test/flutter_test.dart';

import 'package:velocimetro/main.dart';

void main() {
  testWidgets('Muestra el velocímetro y el botón iniciar', (WidgetTester tester) async {
    await tester.pumpWidget(const VelocimetroApp());

    expect(find.text('Velocímetro GPS'), findsOneWidget);
    expect(find.text('km/h'), findsOneWidget);
    expect(find.text('INICIAR'), findsOneWidget);
  });
}
