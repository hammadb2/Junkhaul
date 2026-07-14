import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/app_theme.dart';
import '../../../data/repositories/auth_repository.dart';

/// Shown when the employee is authenticated but status is
/// `pending_verification`. Polls /api/employee/me and routes to /schedule
/// when approved.
class VerificationPendingScreen extends ConsumerWidget {
  const VerificationPendingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authRepositoryProvider);
    final emp = auth.employee;

    return Scaffold(
      backgroundColor: AppColors.bgBase,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.hourglass_top_rounded, size: 56, color: AppColors.statusAmber),
                const SizedBox(height: 16),
                Text('Verification Pending', style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 8),
                Text(
                  emp != null
                      ? 'Hi ${emp.name}, your account is pending manager approval. '
                          'You will be notified when approved.'
                      : 'Your account is pending manager approval. '
                          'You will be notified when approved.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
                ),
                const SizedBox(height: 24),
                TextButton(
                  onPressed: () => ref.read(authRepositoryProvider.notifier).logout(),
                  child: const Text('Sign Out'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
