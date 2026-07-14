import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/app_theme.dart';
import '../../../data/repositories/auth_repository.dart';

/// Main schedule screen. The full Mapbox map + bottom sheet will be built
/// here in Phase 8. For now it shows the authenticated employee's name and
/// a logout button.
class ScheduleScreen extends ConsumerWidget {
  const ScheduleScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authRepositoryProvider);
    final emp = auth.employee;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Today\'s Route'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign Out',
            onPressed: () => ref.read(authRepositoryProvider.notifier).logout(),
          ),
        ],
      ),
      backgroundColor: AppColors.bgBase,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.map_outlined, size: 56, color: AppColors.accent),
              const SizedBox(height: 16),
              Text(
                emp != null ? 'Welcome, ${emp.name}' : 'Welcome',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              Text(
                'Schedule + map coming in Phase 8.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
