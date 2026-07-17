import 'package:flutter/material.dart';
import '../../../../core/app_theme.dart';
import '../../../shared/jh_primary_button.dart';

/// Step 8 — celebratory completion; hands off to verification-pending.
class CompleteStep extends StatelessWidget {
  const CompleteStep({super.key, required this.firstName, required this.onNext});

  final String firstName;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 76,
                    height: 76,
                    decoration: const BoxDecoration(color: AppColors.statusGreen, shape: BoxShape.circle),
                    child: const Icon(Icons.check_rounded, color: Colors.white, size: 36),
                  ),
                  const SizedBox(height: 20),
                  Text("You're all set, $firstName", style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                  const SizedBox(height: 8),
                  const Text(
                    "Your application is complete and headed to review. We'll text you the moment you're approved.",
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 15, color: AppColors.textSecondary, height: 1.5),
                  ),
                ],
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 26),
          child: JhPrimaryButton(label: 'Continue', onPressed: onNext),
        ),
      ],
    );
  }
}
