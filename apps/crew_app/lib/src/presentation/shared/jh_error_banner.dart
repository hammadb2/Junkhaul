import 'package:flutter/material.dart';
import '../../core/app_theme.dart';

enum JhBannerTone { warning, error }

/// Inline error/warning banner — network failures, AI hazard flags,
/// customer-not-home, etc. Distinct from [AsyncErrorScreen], which is a
/// full-screen state.
class JhErrorBanner extends StatelessWidget {
  const JhErrorBanner({
    super.key,
    required this.title,
    required this.message,
    this.tone = JhBannerTone.error,
    this.actions = const [],
  });

  final String title;
  final String message;
  final JhBannerTone tone;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final isWarning = tone == JhBannerTone.warning;
    final bg = isWarning ? const Color(0xFFFEF6E7) : const Color(0xFFFDECEC);
    final border = isWarning
        ? const Color(0xFFFBE3B8)
        : const Color(0xFFF8C4C4);
    final fg = isWarning ? AppColors.statusAmber : AppColors.statusRed;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            isWarning ? Icons.warning_amber_rounded : Icons.error_outline,
            color: fg,
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  message,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                    height: 1.4,
                  ),
                ),
                if (actions.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Row(
                    children:
                        [for (final a in actions) Expanded(child: a)]
                            .expand((w) => [w, const SizedBox(width: 8)])
                            .toList()
                          ..removeLast(),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
