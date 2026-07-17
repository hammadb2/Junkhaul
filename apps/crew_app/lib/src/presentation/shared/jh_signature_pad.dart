import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import '../../domain/models/signature.dart';

/// Drawable signature capture — used for the contract step and the
/// after-photo/signature job step. Real freehand capture (not a static
/// mock): tracks strokes via [onChanged] and exposes [exportPng] for
/// upload.
class JhSignaturePad extends StatefulWidget {
  const JhSignaturePad({super.key, this.onChanged, this.height = 150});

  final ValueChanged<List<SignatureStroke>>? onChanged;
  final double height;

  @override
  State<JhSignaturePad> createState() => JhSignaturePadState();
}

class JhSignaturePadState extends State<JhSignaturePad> {
  final List<SignatureStroke> _strokes = [];

  bool get isEmpty => _strokes.isEmpty;

  void clear() {
    setState(_strokes.clear);
    widget.onChanged?.call(_strokes);
  }

  void _start(Offset p) {
    setState(() => _strokes.add(SignatureStroke([p])));
  }

  void _extend(Offset p) {
    setState(() => _strokes.last.points.add(p));
    widget.onChanged?.call(_strokes);
  }

  /// Renders the captured strokes to a PNG. TODO(dev): call this on submit
  /// and upload the bytes alongside the job record.
  Future<Uint8List> exportPng({required Size size}) async {
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    _SignaturePainter(_strokes).paint(canvas, size);
    final picture = recorder.endRecording();
    final image = await picture.toImage(
      size.width.toInt(),
      size.height.toInt(),
    );
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    return bytes!.buffer.asUint8List();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onPanStart: (d) => _start(d.localPosition),
      onPanUpdate: (d) => _extend(d.localPosition),
      child: Container(
        height: widget.height,
        width: double.infinity,
        decoration: BoxDecoration(
          color: AppColors.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: AppColors.borderSubtle,
            width: 1.5,
            style: BorderStyle.solid,
          ),
        ),
        child: CustomPaint(
          painter: _SignaturePainter(_strokes),
          size: Size.infinite,
        ),
      ),
    );
  }
}

class _SignaturePainter extends CustomPainter {
  _SignaturePainter(this.strokes);
  final List<SignatureStroke> strokes;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.textPrimary
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;
    for (final stroke in strokes) {
      for (var i = 0; i < stroke.points.length - 1; i++) {
        canvas.drawLine(stroke.points[i], stroke.points[i + 1], paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _SignaturePainter oldDelegate) =>
      oldDelegate.strokes != strokes;
}
