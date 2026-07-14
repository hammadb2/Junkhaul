import 'package:flutter/material.dart';

import '../core/app_theme.dart';
import '../presentation/shared/jh_primary_button.dart';

/// Replaces the default red error screen with a branded error state.
/// Set via [ErrorWidget.builder] in [main.dart].
class AppErrorWidget extends StatelessWidget {
  const AppErrorWidget({
    super.key,
    required this.error,
    this.onRetry,
  });

  final FlutterErrorDetails error;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.bgBase,
      child: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 56, color: AppColors.statusRed),
                const SizedBox(height: 16),
                Text('Something went wrong', style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 8),
                Text(
                  'The app hit an unexpected error. You can try again.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
                ),
                const SizedBox(height: 24),
                if (onRetry != null)
                  JhPrimaryButton(label: 'Try Again', onPressed: onRetry!),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Sets [ErrorWidget.builder] so Flutter never shows the red screen.
void configureErrorWidget() {
  ErrorWidget.builder = (details) {
    return AppErrorWidget(error: details);
  };
}
