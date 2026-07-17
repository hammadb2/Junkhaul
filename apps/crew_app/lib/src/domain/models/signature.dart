import 'dart:ui';

/// A single freehand stroke captured by [JhSignaturePad], as normalized
/// (0..1) points so it survives resizing / serializes cleanly.
class SignatureStroke {
  SignatureStroke(this.points);
  final List<Offset> points;
}

/// The result handed back once a signature is captured.
///
/// TODO(dev): decide how you persist this — e.g. render to PNG via
/// [JhSignaturePad.exportPng] and upload, or store the stroke data directly.
class SignatureResult {
  const SignatureResult({required this.strokes, required this.signedAt, this.signedByDelegate = false});
  final List<SignatureStroke> strokes;
  final DateTime signedAt;
  final bool signedByDelegate;
}
