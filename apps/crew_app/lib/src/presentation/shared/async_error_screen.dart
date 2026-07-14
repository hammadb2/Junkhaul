import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/app_theme.dart';
import 'jh_error_banner.dart';
import 'jh_primary_button.dart';

/// Generic error screen shown when a Riverpod provider returns [AsyncError].
/// Used by screens that need a full-page error state with retry.
class AsyncErrorScreen extends StatelessWidget {
  const AsyncErrorScreen({
    super.key,
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgBase,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.cloud_off_rounded, size: 56, color: AppColors.textSecondary),
                const SizedBox(height: 16),
                Text('Connection Error', style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 12),
                JhErrorBanner(message: message),
                const SizedBox(height: 24),
                JhPrimaryButton(label: 'Retry', onPressed: onRetry),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Helper that maps an [AsyncValue] error to a user-friendly message.
String asyncErrorMessage(Object? error) {
  final str = error.toString();
  // Strip common exception prefixes for cleaner display.
  if (str.startsWith('Exception: ')) return str.substring(11);
  if (str.startsWith('NetworkException: ')) return str.substring(18);
  if (str.startsWith('AuthException: ')) return str.substring(15);
  if (str.startsWith('ServerException: ')) return str.substring(17);
  return str;
}
