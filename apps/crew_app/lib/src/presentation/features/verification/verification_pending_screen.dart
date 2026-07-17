import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/app_theme.dart';
import '../../../data/repositories/auth_repository.dart';
import '../../shared/jh_secondary_button.dart';

/// Shown to a new hire waiting on office approval after onboarding.
/// Wired to [AuthRepository] — the router will auto-redirect once
/// verification status changes.
class VerificationPendingScreen extends ConsumerWidget {
  const VerificationPendingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authRepositoryProvider);
    final firstName = _extractFirstName(auth.employee?.name);

    return Scaffold(
      backgroundColor: AppColors.bgBase,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              Expanded(
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 76,
                        height: 76,
                        decoration: const BoxDecoration(color: Color(0xFFFFF1E8), shape: BoxShape.circle),
                        child: const Icon(Icons.schedule_rounded, color: AppColors.statusAmber, size: 32),
                      ),
                      const SizedBox(height: 20),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(color: const Color(0xFFFEF6E7), borderRadius: BorderRadius.circular(999)),
                        child: const Text('PENDING REVIEW', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.statusAmber)),
                      ),
                      const SizedBox(height: 16),
                      Text('Almost there, $firstName', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                      const SizedBox(height: 8),
                      const Text(
                        "Our office is checking your documents. Most crew get approved within one business day — we'll text you the second you're in.",
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 15, color: AppColors.textSecondary, height: 1.5),
                      ),
                    ],
                  ),
                ),
              ),
              JhSecondaryButton(
                label: 'Sign Out',
                onPressed: () async {
                  await ref.read(authRepositoryProvider.notifier).logout();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _extractFirstName(String? fullName) {
    if (fullName == null || fullName.isEmpty) return 'there';
    return fullName.trim().split(' ').first;
  }
}
