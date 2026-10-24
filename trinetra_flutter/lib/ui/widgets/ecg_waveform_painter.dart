import 'dart:math';
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class EcgWaveformPainter extends CustomPainter {
  final int phase;
  final bool isAttacking;
  final Color traceColor;
  final int heartRate;

  EcgWaveformPainter({
    required this.phase,
    required this.isAttacking,
    required this.traceColor,
    this.heartRate = 75,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // 1. Hospital Monitor Dark Grid Background
    final minorGridPaint = Paint()
      ..color = const Color(0xFF1E293B).withOpacity(0.4)
      ..strokeWidth = 0.5;

    final majorGridPaint = Paint()
      ..color = const Color(0xFF334155).withOpacity(0.5)
      ..strokeWidth = 1.0;

    const double step = 15.0;
    int col = 0;
    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), col % 4 == 0 ? majorGridPaint : minorGridPaint);
      col++;
    }
    int row = 0;
    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), row % 4 == 0 ? majorGridPaint : minorGridPaint);
      row++;
    }

    final double midY = size.height / 2;

    // Center Baseline
    final baselinePaint = Paint()
      ..color = const Color(0xFF475569).withOpacity(0.3)
      ..strokeWidth = 1;
    canvas.drawLine(Offset(0, midY), Offset(size.width, midY), baselinePaint);

    // Flatline Asystole check
    if (heartRate <= 0) {
      final flatlinePath = Path();
      for (double x = 0; x < size.width; x += 4) {
        final noise = (sin(x * 0.2 + phase) * 1.5);
        if (x == 0) {
          flatlinePath.moveTo(x, midY + noise);
        } else {
          flatlinePath.lineTo(x, midY + noise);
        }
      }
      final flatPaint = Paint()
        ..color = AppColors.danger
        ..strokeWidth = 2.0
        ..style = PaintingStyle.stroke;
      canvas.drawPath(flatlinePath, flatPaint);
      return;
    }

    // Physiological PQRST Lead II Model
    // P wave (atrial depolarization), PR segment, QRS (ventricular depolarization), ST segment, T wave (ventricular repolarization)
    final List<double> pqrst = [
      0.0, 1.5, 3.5, 1.5, 0.0, // P wave
      0.0, -4.0, 32.0, -10.0, 0.0, // Q-R-S complex (R peak)
      0.5, 2.0, 5.0, 7.0, 4.0, 1.0, 0.0, // T wave
      0.0, 0.0, 0.0, 0.0, 0.0, 0.0, // Isoelectric baseline
    ];

    final int count = pqrst.length;
    final int displayCycles = 3;
    final double totalSteps = (count * displayCycles).toDouble();
    final double xStep = size.width / totalSteps;

    final path = Path();
    final glowPath = Path();

    double lastX = 0;
    double lastY = midY;

    for (int i = 0; i <= totalSteps.toInt(); i++) {
      final shiftedIdx = (i + (phase * 2)) % count;
      double heightFactor = pqrst[shiftedIdx];

      if (isAttacking) {
        // Ventricular Tachycardia / Arrhythmic perturbation
        if (shiftedIdx % 3 == 0) {
          heightFactor += ((i % 4) == 0 ? 12.0 : -10.0);
        }
        heightFactor *= 1.35;
      }

      final x = i * xStep;
      final y = midY - heightFactor;

      if (i == 0) {
        path.moveTo(x, y);
        glowPath.moveTo(x, y);
      } else {
        path.lineTo(x, y);
        glowPath.lineTo(x, y);
      }
      lastX = x;
      lastY = y;
    }

    // Outer Neon Glow
    final glowPaint = Paint()
      ..color = traceColor.withOpacity(0.35)
      ..strokeWidth = 4.5
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;
    canvas.drawPath(glowPath, glowPaint);

    // Sharp Clinical Trace
    final wavePaint = Paint()
      ..color = traceColor
      ..strokeWidth = 2.0
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;
    canvas.drawPath(path, wavePaint);

    // Sweep Cursor Blip
    final cursorPaint = Paint()..color = Colors.white;
    canvas.drawCircle(Offset(lastX, lastY), 3.0, cursorPaint);
  }

  @override
  bool shouldRepaint(covariant EcgWaveformPainter oldDelegate) {
    return oldDelegate.phase != phase ||
        oldDelegate.isAttacking != isAttacking ||
        oldDelegate.traceColor != traceColor ||
        oldDelegate.heartRate != heartRate;
  }
}
