import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/app_theme.dart';
import '../../../data/repositories/auth_repository.dart';

/// Brief splash shown while [AuthRepository] bootstraps the session cookie
/// and resolves the initial auth state.
class SplashScreen extends ConsumerWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authRepositoryProvider);

    return Scaffold(
      backgroundColor: AppColors.bgBase,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.local_shipping_rounded,
              size: 64,
              color: AppColors.accent,
            ),
            const SizedBox(height: 16),
            Text(
              'Junkhaul Crew',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 32),
            if (auth.status == AuthStatus.unknown)
              const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accent),
              ),
          ],
        ),
      ),
    );
  }
}
