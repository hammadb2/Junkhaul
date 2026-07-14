import 'package:flutter/material.dart';

import '../../../core/app_theme.dart';

/// Placeholder onboarding shell. The 8-step onboarding flow will be built
/// here in Phase 7.2.
class OnboardScreen extends StatelessWidget {
  const OnboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Onboarding')),
      backgroundColor: AppColors.bgBase,
      body: const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'Onboarding flow coming in Phase 7.2.\n\n'
            'Steps: Account → Documents → TD1 Federal → TD1AB → Contract → '
            'Banking → Acknowledgments → Complete.',
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }
}
