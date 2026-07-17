import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import 'jh_secondary_button.dart';

/// Full-screen error/empty state — failed loads, no connectivity on first
/// launch, etc. For inline errors within a screen use [JhErrorBanner].
class AsyncErrorScreen extends StatelessWidget {
  const AsyncErrorScreen({
    super.key,
    this.title = 'Something went wrong',
    this.message =
        "We couldn't load this. Check your connection and try again.",
    required this.onRetry,
  });

  final String title;
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgBase,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: const BoxDecoration(
                  color: AppColors.bgInput,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.cloud_off_rounded,
                  size: 32,
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 24),
              JhSecondaryButton(label: 'Try Again', onPressed: onRetry),
            ],
          ),
        ),
      ),
    );
  }
}
