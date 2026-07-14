import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import 'jh_skeleton.dart';

class JhPhotoThumbnail extends StatelessWidget {
  const JhPhotoThumbnail({
    super.key,
    required this.imageUrl,
    this.size = 80,
    this.borderRadius = 12.0,
  });

  final String imageUrl;
  final double size;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: SizedBox(
        width: size,
        height: size,
        child: CachedNetworkImage(
          imageUrl: imageUrl,
          fit: BoxFit.cover,
          placeholder: (context, url) => const JhSkeleton(),
          errorWidget: (context, url, error) => Container(
            color: AppColors.bgInput,
            child: const Icon(
              Icons.broken_image,
              color: AppColors.textDisabled,
            ),
          ),
        ),
      ),
    );
  }
}
