import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/animations.dart';
import '../../core/app_theme.dart';

class JhPrimaryButton extends StatefulWidget {
  const JhPrimaryButton({
    super.key,
    required this.label,
    this.onPressed,
    this.isLoading = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;

  @override
  State<JhPrimaryButton> createState() => _JhPrimaryButtonState();
}

class _JhPrimaryButtonState extends State<JhPrimaryButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final isDisabled = widget.onPressed == null || widget.isLoading;

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
              color: AppColors.accent,
              borderRadius: BorderRadius.circular(14),
            ),
            child: widget.isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Text(
                    widget.label,
                    style: const TextStyle(
                      color: Colors.white,
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
