import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/app_theme.dart';
import '../../../../data/api/employee_api.dart';
import '../../../shared/jh_primary_button.dart';
import '../../../shared/jh_text_field.dart';

/// Step 6 — direct deposit banking details.
///
/// Banking fields are encrypted at rest by the backend (bank_account_enc).
/// The account number is never logged or stored locally.
class BankingStep extends ConsumerStatefulWidget {
  const BankingStep({super.key, required this.onNext});

  final VoidCallback onNext;

  @override
  ConsumerState<BankingStep> createState() => _BankingStepState();
}

class _BankingStepState extends ConsumerState<BankingStep> {
  final _institutionController = TextEditingController();
  final _transitController = TextEditingController();
  final _accountController = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _institutionController.dispose();
    _transitController.dispose();
    _accountController.dispose();
    super.dispose();
  }

  bool get _isValid {
    if (_institutionController.text.trim().length != 3) return false;
    if (_transitController.text.trim().length != 5) return false;
    if (_accountController.text.trim().length < 7) return false;
    return true;
  }

  Future<void> _saveAndContinue() async {
    if (!_isValid) {
      setState(
        () => _error =
            'Institution (3 digits), transit (5 digits), and account (7+ digits) required.',
      );
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final api = await ref.read(employeeApiProvider.future);
      await api.updateProfile({
        'bank_institution': _institutionController.text.trim(),
        'bank_transit': _transitController.text.trim(),
        'bank_account': _accountController.text.trim(),
        'onboarding_step': 5,
      });
      // Clear the account number from memory immediately after upload.
      _accountController.clear();
      if (mounted) widget.onNext();
    } catch (e) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = 'Failed to save banking info: $e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
            children: [
              const Text(
                'Direct deposit',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              const Text(
                'Where we send your pay. From a void cheque or your banking app.',
                style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 20),
              JhTextField(
                label: 'Institution number',
                hint: '003',
                controller: _institutionController,
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 14),
              JhTextField(
                label: 'Transit number',
                hint: '12345',
                controller: _transitController,
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 14),
              JhTextField(
                label: 'Account number',
                hint: '1234567',
                controller: _accountController,
                keyboardType: TextInputType.number,
                obscureText: true,
              ),
              const SizedBox(height: 14),
              const Text(
                'Your account number is encrypted before storage and never logged.',
                style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
              if (_error != null) ...[
                const SizedBox(height: 14),
                Text(
                  _error!,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.statusRed,
                  ),
                ),
              ],
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 26),
          child: JhPrimaryButton(
            label: _saving ? 'Saving…' : 'Continue',
            onPressed: _saving ? null : _saveAndContinue,
          ),
        ),
      ],
    );
  }
}
