import 'package:flutter/material.dart';

import '../../core/app_theme.dart';

class JhBottomSheetHandle extends StatelessWidget {
  const JhBottomSheetHandle({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 36,
      height: 4,
      margin: const EdgeInsets.only(top: 8),
      decoration: BoxDecoration(
        color: AppColors.borderSubtle,
        borderRadius: BorderRadius.circular(2),
      ),
    );
  }
}
