import 'package:flutter/material.dart';
import '../../core/app_theme.dart';

enum JhPillTone { green, amber, red, gray }

/// Status badge — job status, item condition, verification state.
class JhStatusPill extends StatelessWidget {
  const JhStatusPill({super.key, required this.label, required this.tone});

  final String label;
  final JhPillTone tone;

  (Color, Color) get _colors {
    switch (tone) {
      case JhPillTone.green:
        return (const Color(0xFFE8FBF0), AppColors.statusGreen);
      case JhPillTone.amber:
        return (const Color(0xFFFEF6E7), AppColors.statusAmber);
      case JhPillTone.red:
        return (const Color(0xFFFDECEC), AppColors.statusRed);
      case JhPillTone.gray:
        return (AppColors.bgInput, AppColors.textSecondary);
    }
  }

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = _colors;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: fg,
          letterSpacing: 0.2,
        ),
      ),
    );
  }
}
