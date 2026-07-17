import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/app_theme.dart';
import '../../../shared/jh_primary_button.dart';
import '../../../shared/jh_signature_pad.dart';

/// Step 5 — read the agreement, sign to accept.
///
/// TODO(dev): load the real contract body (from your CMS/legal doc store)
/// into the scrollable preview, and on [onNext] export the signature PNG
/// via [JhSignaturePadState.exportPng] and submit alongside the record.
class ContractStep extends StatefulWidget {
  const ContractStep({super.key, required this.onNext});

  final VoidCallback onNext;

  @override
  State<ContractStep> createState() => _ContractStepState();
}

class _ContractStepState extends State<ContractStep> {
  final _sigKey = GlobalKey<JhSignaturePadState>();
  bool _hasSignature = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
            children: [
              const Text('Your contract', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
              const SizedBox(height: 6),
              const Text('Read it, then sign below.', style: TextStyle(fontSize: 14, color: AppColors.textSecondary)),
              const SizedBox(height: 16),
              Container(
                height: 150,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: AppColors.bgCard, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.borderSubtle)),
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Casual Crew Agreement — Junkhaul Calgary Ltd.\n\nThis agreement sets out pay rate, job assignment via the dispatch app, vehicle and equipment use, and conduct on customer property. By signing below you agree to the full terms provided in your welcome packet.',
                        style: TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.6),
                      ),
                      const SizedBox(height: 8),
                      GestureDetector(
                        onTap: () async {
                          final uri = Uri.parse('https://www.junkhaul.ca/policies');
                          if (await canLaunchUrl(uri)) {
                            await launchUrl(uri, mode: LaunchMode.externalApplication);
                          }
                        },
                        child: const Text(
                          'View all policies →',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.accent),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text('Sign to accept', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
              const SizedBox(height: 8),
              JhSignaturePad(key: _sigKey, onChanged: (strokes) => setState(() => _hasSignature = strokes.isNotEmpty)),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Draw with your finger', style: TextStyle(fontSize: 12, color: AppColors.textDisabled)),
                  TextButton(
                    onPressed: () {
                      _sigKey.currentState?.clear();
                      setState(() => _hasSignature = false);
                    },
                    child: const Text('Clear', style: TextStyle(color: AppColors.accent, fontSize: 12, fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 26),
          child: JhPrimaryButton(label: 'Sign & Continue', onPressed: _hasSignature ? widget.onNext : null),
        ),
      ],
    );
  }
}
