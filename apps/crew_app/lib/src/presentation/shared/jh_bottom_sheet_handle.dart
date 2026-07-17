import 'package:flutter/material.dart';
import '../../core/app_theme.dart';

/// Drag handle shown at the top of every bottom sheet (schedule sheet,
/// document viewers, etc).
class JhBottomSheetHandle extends StatelessWidget {
  const JhBottomSheetHandle({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        margin: const EdgeInsets.only(top: 10, bottom: 4),
        width: 40,
        height: 5,
        decoration: BoxDecoration(color: AppColors.borderSubtle, borderRadius: BorderRadius.circular(99)),
      ),
    );
  }
}
