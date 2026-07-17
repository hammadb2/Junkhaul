import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/app_theme.dart';
import '../../../data/repositories/auth_repository.dart';
import '../../shared/jh_step_progress.dart';
import 'steps/account_step.dart';
import 'steps/documents_step.dart';
import 'steps/td1_federal_step.dart';
import 'steps/td1ab_step.dart';
import 'steps/contract_step.dart';
import 'steps/banking_step.dart';
import 'steps/acknowledgments_step.dart';
import 'steps/complete_step.dart';

/// Onboarding shell — hosts the 8 new-hire steps and owns step-to-step
/// transitions + the shared progress header. Wired to [AuthRepository]
/// for the employee's first name and completion redirect.
class OnboardScreen extends ConsumerStatefulWidget {
  const OnboardScreen({super.key});

  @override
  ConsumerState<OnboardScreen> createState() => _OnboardScreenState();
}

class _OnboardScreenState extends ConsumerState<OnboardScreen> {
  int _step = 0;
  static const _totalSteps = 8;
  static const _labels = [
    'Account',
    'Documents',
    'TD1 Federal',
    'TD1AB',
    'Contract',
    'Banking',
    'Acknowledgments',
    'Complete',
  ];

  String get _firstName {
    final auth = ref.read(authRepositoryProvider);
    final name = auth.employee?.name ?? 'Crew';
    return name.trim().split(' ').first;
  }

  void _next() {
    if (_step == _totalSteps - 1) {
      // Refresh auth state — the router will redirect to verification/schedule.
      ref.invalidate(authRepositoryProvider);
      return;
    }
    setState(() => _step++);
  }

  void _back() {
    if (_step == 0) return;
    setState(() => _step--);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgBase,
      body: SafeArea(
        child: Column(
          children: [
            if (_step < _totalSteps - 1)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                child: JhStepProgress(
                  currentStep: _step + 1,
                  totalSteps: _totalSteps,
                  stepLabel: _labels[_step],
                ),
              ),
            Expanded(child: _buildStep()),
          ],
        ),
      ),
    );
  }

  Widget _buildStep() {
    switch (_step) {
      case 0:
        return AccountStep(onNext: _next);
      case 1:
        return DocumentsStep(onNext: _next);
      case 2:
        return Td1FederalStep(onNext: _next);
      case 3:
        return Td1AbStep(onNext: _next);
      case 4:
        return ContractStep(onNext: _next);
      case 5:
        return BankingStep(onNext: _next);
      case 6:
        return AcknowledgmentsStep(onNext: _next);
      case 7:
      default:
        return CompleteStep(firstName: _firstName, onNext: _next);
    }
  }
}
