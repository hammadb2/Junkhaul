import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/app_theme.dart';
import '../../../../domain/models/booking.dart';
import '../../../../domain/providers/job_provider.dart';
import '../../../shared/jh_card.dart';
import '../../../shared/jh_error_banner.dart';
import '../../../shared/jh_primary_button.dart';

/// Step 9: Signature. Customer signs, types their name, and confirms the amount.
/// Calls POST /api/employee/signature to complete the job.
/// Also captures the "After" photo here (Section 6.6).
class SignatureStep extends ConsumerStatefulWidget {
  const SignatureStep({super.key, required this.booking, required this.stepController});
  final Booking booking;
  final JobStepController stepController;

  @override
  ConsumerState<SignatureStep> createState() => _SignatureStepState();
}

class _SignatureStepState extends ConsumerState<SignatureStep> {
  final _nameController = TextEditingController();
  String? _afterPhotoPath;
  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final amount = widget.booking.totalPrice ?? 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // After photo capture
        Text('After Photo', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 4),
        Text(
          'Capture the space after junk has been removed.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(height: 12),
        GestureDetector(
          onTap: () => setState(() => _afterPhotoPath = 'placeholder://after_${DateTime.now().millisecondsSinceEpoch}'),
          child: JhCard(
            child: Container(
              height: 160,
              alignment: Alignment.center,
              child: _afterPhotoPath == null
                  ? Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.camera_alt_rounded, size: 36, color: AppColors.textSecondary),
                        const SizedBox(height: 8),
                        Text('Tap to capture after photo', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary)),
                      ],
                    )
                  : const Icon(Icons.check_circle_rounded, size: 36, color: AppColors.statusGreen),
            ),
          ),
        ),
        const SizedBox(height: 24),
        // Signature pad
        Text('Customer Signature', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        JhCard(
          child: Container(
            height: 180,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.borderSubtle),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.draw_rounded, size: 40, color: AppColors.textSecondary),
                const SizedBox(height: 8),
                Text(
                  'Signature pad',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
                ),
                // In production, use the `signature` package for a SignaturePad widget.
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        // Customer name typed
        TextField(
          controller: _nameController,
          decoration: const InputDecoration(
            labelText: 'Customer name (typed)',
            isDense: true,
          ),
        ),
        const SizedBox(height: 16),
        // Amount confirmation
        JhCard(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Amount confirmed:', style: Theme.of(context).textTheme.bodyMedium),
                Text(
                  '\$${amount.toStringAsFixed(0)}',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                ),
              ],
            ),
          ),
        ),
        if (_errorMessage != null) ...[
          const SizedBox(height: 16),
          JhErrorBanner(message: _errorMessage!),
        ],
        const SizedBox(height: 24),
        JhPrimaryButton(
          label: 'Complete Job',
          isLoading: _isSubmitting,
          onPressed: _handleComplete,
        ),
      ],
    );
  }

  Future<void> _handleComplete() async {
    if (_nameController.text.trim().isEmpty) {
      setState(() => _errorMessage = 'Customer name is required.');
      return;
    }
    if (_afterPhotoPath == null) {
      setState(() => _errorMessage = 'After photo is required.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      // In production:
      // await ref.read(employeeApiProvider).submitSignature(
      //   bookingId: widget.booking.id,
      //   customerNameTyped: _nameController.text.trim(),
      //   customerSignatureUrl: signatureUrl,
      //   amountConfirmed: widget.booking.totalPrice ?? 0,
      //   paymentMethod: 'cash', // or 'card'
      // );
      if (mounted) {
        widget.stepController.advance();
      }
    } catch (e) {
      if (mounted) setState(() => _errorMessage = e.toString());
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }
}
