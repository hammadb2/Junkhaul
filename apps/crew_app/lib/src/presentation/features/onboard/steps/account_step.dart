import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/app_theme.dart';
import '../../../../data/api/employee_api.dart';
import '../../../shared/jh_primary_button.dart';
import '../../../shared/jh_text_field.dart';

/// Step 1 — legal name & contact info (must match ID for later steps).
///
/// Fields are persisted to /api/employee/me on continue.
class AccountStep extends ConsumerStatefulWidget {
  const AccountStep({super.key, required this.onNext});

  final VoidCallback onNext;

  @override
  ConsumerState<AccountStep> createState() => _AccountStepState();
}

class _AccountStepState extends ConsumerState<AccountStep> {
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emergencyContactController = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    _emergencyContactController.dispose();
    super.dispose();
  }

  bool get _isValid {
    if (_firstNameController.text.trim().isEmpty) return false;
    if (_lastNameController.text.trim().isEmpty) return false;
    if (_phoneController.text.trim().length < 10) return false;
    return true;
  }

  Future<void> _saveAndContinue() async {
    if (!_isValid) {
      setState(() => _error = 'Please fill in all required fields.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final api = await ref.read(employeeApiProvider.future);
      await api.updateProfile({
        'phone': _phoneController.text.trim(),
        'onboarding_step': 1,
      });
      if (mounted) widget.onNext();
    } catch (e) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = 'Failed to save: $e';
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
                'Your account',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              const Text(
                'Legal name — it has to match your ID.',
                style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 20),
              JhTextField(
                label: 'Legal first name',
                hint: 'First name',
                controller: _firstNameController,
              ),
              const SizedBox(height: 14),
              JhTextField(
                label: 'Legal last name',
                hint: 'Last name',
                controller: _lastNameController,
              ),
              const SizedBox(height: 14),
              JhTextField(
                label: 'Mobile number',
                hint: '(403) 555-0134',
                controller: _phoneController,
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 14),
              JhTextField(
                label: 'Emergency contact',
                hint: 'Name and phone number',
                controller: _emergencyContactController,
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
