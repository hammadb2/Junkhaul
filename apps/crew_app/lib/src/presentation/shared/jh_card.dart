import 'package:flutter/material.dart';
import '../../core/app_theme.dart';

/// Standard card container — job cards, list rows, form sections.
/// Selectable variant adds an accent border + optional tap handler for
/// choice cards (payment method, route decision, etc.).
class JhCard extends StatelessWidget {
  const JhCard({
    super.key,
    required this.child,
    this.onTap,
    this.selected = false,
    this.padding = const EdgeInsets.all(16),
  });

  final Widget child;
  final VoidCallback? onTap;
  final bool selected;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final card = AnimatedContainer(
      duration: const Duration(milliseconds: 120),
      padding: padding,
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: selected ? AppColors.accent : AppColors.borderSubtle,
          width: selected ? 1.5 : 1,
        ),
      ),
      child: child,
    );
    if (onTap == null) return card;
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: card,
    );
  }
}
