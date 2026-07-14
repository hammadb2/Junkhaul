import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/animations.dart';
import '../../core/app_theme.dart';

class JhSecondaryButton extends StatefulWidget {
  const JhSecondaryButton({
    super.key,
    required this.label,
    this.onPressed,
  });

  final String label;
  final VoidCallback? onPressed;

  @override
  State<JhSecondaryButton> createState() => _JhSecondaryButtonState();
}

class _JhSecondaryButtonState extends State<JhSecondaryButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final isDisabled = widget.onPressed == null;

    return GestureDetector(
      onTapDown: isDisabled ? null : (_) => setState(() => _pressed = true),
      onTapUp: isDisabled ? null : (_) => setState(() => _pressed = false),
      onTapCancel: isDisabled ? null : () => setState(() => _pressed = false),
      onTap: isDisabled
          ? null
          : () {
              HapticFeedback.mediumImpact();
              widget.onPressed!();
            },
      child: AnimatedScale(
        scale: _pressed && !isDisabled ? 0.96 : 1.0,
        duration: JhAnimationDurations.stateTransition,
        curve: JhAnimationCurves.stateTransition,
        child: AnimatedOpacity(
          opacity: isDisabled ? 0.4 : 1.0,
          duration: JhAnimationDurations.stateTransition,
          child: Container(
            height: 52,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: Colors.transparent,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: AppColors.borderSubtle,
                width: 1.5,
              ),
            ),
            child: Text(
              widget.label,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 15,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
