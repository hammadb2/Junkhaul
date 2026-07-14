import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

import '../../core/app_theme.dart';

class JhSkeleton extends StatelessWidget {
  const JhSkeleton({
    super.key,
    this.width,
    this.height,
    this.borderRadius = 8.0,
  });

  final double? width;
  final double? height;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: AppColors.borderSubtle,
      highlightColor: AppColors.bgInput,
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: AppColors.borderSubtle,
          borderRadius: BorderRadius.circular(borderRadius),
        ),
      ),
    );
  }
}
