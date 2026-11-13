import 'dart:async';
import 'dart:math' as math;

import 'package:material_ui/material_ui.dart';
import 'package:geolocator/geolocator.dart';

void main() {
  runApp(const VelocimetroApp());
}

class VelocimetroApp extends StatelessWidget {
  const VelocimetroApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Velocímetro GPS',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blueAccent),
        useMaterial3: true,
      ),
      home: const VelocimetroPage(),
    );
  }
}

class VelocimetroPage extends StatefulWidget {
  const VelocimetroPage({super.key});

  @override
  State<VelocimetroPage> createState() => _VelocimetroPageState();
}

class _VelocimetroPageState extends State<VelocimetroPage> {
  static const double _maxKmh = 200;

  StreamSubscription<Position>? _sub;
  bool _midienndo = false;
  bool _gpsListo = false;
  String? _error;

  double _velocidadKmh = 0;
  double _velocidadMaxima = 0;
  double _distanciaKm = 0;
  Position? _ultimaPosicion;
  DateTime? _ultimoTiempo;

  Future<void> _iniciar() async {
    setState(() => _error = null);

    bool servicio = await Geolocator.isLocationServiceEnabled();
    if (!servicio) {
      setState(() => _error = 'Activa el GPS del dispositivo.');
      return;
    }

    LocationPermission permiso = await Geolocator.checkPermission();
    if (permiso == LocationPermission.denied) {
      permiso = await Geolocator.requestPermission();
    }
    if (permiso == LocationPermission.denied ||
        permiso == LocationPermission.deniedForever) {
      setState(() => _error = 'Permiso de ubicación denegado.');
      return;
    }

    _sub?.cancel();
    _velocidadKmh = 0;
    _velocidadMaxima = 0;
    _distanciaKm = 0;
    _ultimaPosicion = null;
    _ultimoTiempo = null;

    _sub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.bestForNavigation,
        distanceFilter: 0,
      ),
    ).listen(
      _onPosicion,
      onError: (Object e) {
        setState(() => _error = 'Error GPS: $e');
      },
    );

    setState(() {
      _midienndo = true;
      _gpsListo = true;
    });
  }

  void _detener() {
    _sub?.cancel();
    _sub = null;
    setState(() {
      _midienndo = false;
      _velocidadKmh = 0;
    });
  }

  void _onPosicion(Position pos) {
    final ahora = pos.timestamp;
    double distancia = 0;
    double velocidadKmh = pos.speed.isFinite ? pos.speed * 3.6 : 0;

    if (_ultimaPosicion != null && _ultimoTiempo != null) {
      distancia = Geolocator.distanceBetween(
        _ultimaPosicion!.latitude,
        _ultimaPosicion!.longitude,
        pos.latitude,
        pos.longitude,
      );
      final dt = ahora.difference(_ultimoTiempo!).inMilliseconds / 1000.0;
      // Respaldo: velocidad por distancia/tiempo cuando el GPS no reporta speed
      if (velocidadKmh <= 0 && dt > 0 && dt < 5 && distancia > 0) {
        velocidadKmh = distancia / dt * 3.6;
      }
    }

    setState(() {
      _velocidadKmh = velocidadKmh;
      if (_velocidadKmh > _velocidadMaxima) {
        _velocidadMaxima = _velocidadKmh;
      }
      _distanciaKm += distancia / 1000.0;
      _ultimaPosicion = pos;
      _ultimoTiempo = ahora;
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final fraccion = (_velocidadKmh / _maxKmh).clamp(0.0, 1.0);
    final color = Color.lerp(Colors.green, Colors.red, fraccion) ?? Colors.green;

    return Scaffold(
      appBar: AppBar(title: const Text('Velocímetro GPS')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const Spacer(),
              SizedBox(
                width: 320,
                height: 320,
                child: CustomPaint(
                  painter: _GaugePainter(
                    fraccion: fraccion,
                    color: color,
                    maxKmh: _maxKmh,
                  ),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _velocidadKmh.toStringAsFixed(0),
                          style: TextStyle(
                            fontSize: 72,
                            fontWeight: FontWeight.bold,
                            color: color,
                          ),
                        ),
                        const Text(
                          'km/h',
                          style: TextStyle(fontSize: 22, color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _Dato(label: 'Máxima', valor: '${_velocidadMaxima.toStringAsFixed(0)} km/h'),
                  _Dato(label: 'Distancia', valor: '${_distanciaKm.toStringAsFixed(2)} km'),
                  _Dato(label: 'Estado', valor: _gpsListo ? 'GPS activo' : 'Inactivo'),
                ],
              ),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 16),
                  child: Text(
                    _error!,
                    style: const TextStyle(color: Colors.red),
                    textAlign: TextAlign.center,
                  ),
                ),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                height: 64,
                child: FilledButton.icon(
                  onPressed: _midienndo ? _detener : _iniciar,
                  icon: Icon(_midienndo ? Icons.stop : Icons.play_arrow),
                  label: Text(_midienndo ? 'DETENER' : 'INICIAR'),
                  style: FilledButton.styleFrom(
                    backgroundColor: _midienndo ? Colors.red : Colors.green,
                    textStyle: const TextStyle(fontSize: 20),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Dato extends StatelessWidget {
  final String label;
  final String valor;

  const _Dato({required this.label, required this.valor});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(label, style: const TextStyle(color: Colors.grey)),
        Text(valor, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
      ],
    );
  }
}

class _GaugePainter extends CustomPainter {
  final double fraccion;
  final Color color;
  final double maxKmh;

  _GaugePainter({
    required this.fraccion,
    required this.color,
    required this.maxKmh,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 20;
    const startAngle = math.pi * 0.75;
    const sweepAngle = math.pi * 1.5;

    final fondo = Paint()
      ..color = Colors.grey.shade300
      ..style = PaintingStyle.stroke
      ..strokeWidth = 18
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweepAngle,
      false,
      fondo,
    );

    final aguja = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 18
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweepAngle * fraccion,
      false,
      aguja,
    );

    // Marcas de velocidad
    final textoPainter = TextPainter(textDirection: TextDirection.ltr);
    for (var i = 0; i <= 10; i++) {
      final angulo = startAngle + sweepAngle * (i / 10);
      final esExterior = i % 5 == 0;
      final r1 = radius - (esExterior ? 26 : 20);
      final p1 = Offset(
        center.dx + r1 * math.cos(angulo),
        center.dy + r1 * math.sin(angulo),
      );
      final p2 = Offset(
        center.dx + (radius - 12) * math.cos(angulo),
        center.dy + (radius - 12) * math.sin(angulo),
      );
      canvas.drawLine(p1, p2, Paint()..color = Colors.black54..strokeWidth = 2);

      if (esExterior) {
        final valor = (maxKmh * i / 10).round();
        textoPainter.text = TextSpan(
          text: '$valor',
          style: const TextStyle(fontSize: 12, color: Colors.black54),
        );
        textoPainter.layout();
        final rt = radius - 48;
        textoPainter.paint(
          canvas,
          Offset(
            center.dx + rt * math.cos(angulo) - textoPainter.width / 2,
            center.dy + rt * math.sin(angulo) - textoPainter.height / 2,
          ),
        );
      }
    }
  }

  @override
  bool shouldRepaint(_GaugePainter old) =>
      old.fraccion != fraccion || old.color != color || old.maxKmh != maxKmh;
}
