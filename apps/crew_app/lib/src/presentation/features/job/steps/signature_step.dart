import 'dart:io';
import 'package:flutter/material.dart';
import '../../../../core/app_theme.dart';
import '../../../shared/jh_photo_thumbnail.dart';
import '../../../shared/jh_primary_button.dart';
import '../../../shared/jh_signature_pad.dart';
import '../../../shared/jh_sync_banner.dart';

/// Step 9/9 — "After Photo" capture, customer signature, and confirmed
/// amount. Handles the signature-absent branch and shows an explicit
/// saved/synced confirmation so nothing feels like it silently vanished.
///
/// TODO(dev): on [onComplete], export the signature PNG (see
/// [JhSignaturePadState.exportPng]) and submit the after-photo + signature
/// + final amount to your job-completion endpoint / offline queue.
class SignatureStep extends StatefulWidget {
  const SignatureStep({
    super.key,
    required this.confirmedAmount,
    required this.customerName,
    required this.onCapturePhoto,
    required this.onComplete,
    this.afterPhotoFile,
    this.isSynced = true,
  });

  final double confirmedAmount;
  final String customerName;
  final VoidCallback onCapturePhoto;
  final void Function({required bool signedByDelegate}) onComplete;
  final File? afterPhotoFile;
  final bool isSynced;

  @override
  State<SignatureStep> createState() => _SignatureStepState();
}

class _SignatureStepState extends State<SignatureStep> {
  bool _customerPresent = true;
  final _sigKey = GlobalKey<JhSignaturePadState>();
  bool _hasSignature = false;

  @override
  Widget build(BuildContext context) {
    final canComplete =
        widget.afterPhotoFile != null && (!_customerPresent || _hasSignature);
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
            children: [
              JhPhotoThumbnail(
                onCapture: widget.onCapturePhoto,
                imageFile: widget.afterPhotoFile,
                label: 'Tap to capture after photo',
                height: 150,
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.bgCard,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.borderSubtle),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Confirmed amount',
                      style: TextStyle(
                        fontSize: 14,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    Text(
                      '\$${widget.confirmedAmount.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 19,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: ChoiceChip(
                      label: const Text('Customer present'),
                      selected: _customerPresent,
                      onSelected: (_) =>
                          setState(() => _customerPresent = true),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ChoiceChip(
                      label: const Text('Not present'),
                      selected: !_customerPresent,
                      onSelected: (_) =>
                          setState(() => _customerPresent = false),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              if (_customerPresent) ...[
                const Text(
                  'Sign here',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                JhSignaturePad(
                  key: _sigKey,
                  height: 140,
                  onChanged: (s) =>
                      setState(() => _hasSignature = s.isNotEmpty),
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${widget.customerName} — customer signature',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textDisabled,
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        _sigKey.currentState?.clear();
                        setState(() => _hasSignature = false);
                      },
                      child: const Text(
                        'Clear',
                        style: TextStyle(
                          color: AppColors.accent,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ] else
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF6E7),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFFBE3B8)),
                  ),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Proceeding without customer signature',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'A note is being added to the office file. If someone else can sign on the customer\'s behalf, switch back to "Customer present."',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 14),
              JhSavedChip(synced: widget.isSynced),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 26),
          child: JhPrimaryButton(
            label: 'Complete Job',
            onPressed: canComplete
                ? () => widget.onComplete(signedByDelegate: !_customerPresent)
                : null,
          ),
        ),
      ],
    );
  }
}
