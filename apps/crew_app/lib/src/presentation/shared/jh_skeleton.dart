import 'package:flutter/material.dart';
import '../../core/app_theme.dart';

/// Shimmering placeholder — use in place of spinners while real content
/// loads (schedule list, job details, etc). Per design direction: skeletons,
/// not spinners.
class JhSkeleton extends StatefulWidget {
  const JhSkeleton({
    super.key,
    this.width = double.infinity,
    this.height = 16,
    this.radius = 8,
  });

  final double width;
  final double height;
  final double radius;

  @override
  State<JhSkeleton> createState() => _JhSkeletonState();
}

class _JhSkeletonState extends State<JhSkeleton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  )..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final t = _controller.value;
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.radius),
            gradient: LinearGradient(
              begin: Alignment(-1 + 2 * t, 0),
              end: Alignment(1 + 2 * t, 0),
              colors: const [
                AppColors.bgInput,
                Color(0xFFE8E8E8),
                AppColors.bgInput,
              ],
              stops: const [0.3, 0.5, 0.7],
            ),
          ),
        );
      },
    );
  }
}

/// A skeletonized job-card row — drop-in stand-in for [JhListTile] while
/// the schedule is loading.
class JhSkeletonCard extends StatelessWidget {
  const JhSkeletonCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          JhSkeleton(width: 140, height: 15),
          SizedBox(height: 10),
          JhSkeleton(width: 200, height: 12),
          SizedBox(height: 6),
          JhSkeleton(width: 160, height: 12),
        ],
      ),
    );
  }
}
