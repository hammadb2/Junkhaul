import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/app_theme.dart';
import '../../../shared/jh_primary_button.dart';

/// Step 7 — policy acknowledgments.
/// Each "View" row opens the corresponding policy on junkhaul.ca.
class AcknowledgmentsStep extends StatefulWidget {
  const AcknowledgmentsStep({super.key, required this.onNext});

  final VoidCallback onNext;

  @override
  State<AcknowledgmentsStep> createState() => _AcknowledgmentsStepState();
}

class _AcknowledgmentsStepState extends State<AcknowledgmentsStep> {
  bool _agree = false;

  static const _policies = [
    {'label': 'Safety policy', 'url': 'https://www.junkhaul.ca/safety-policy'},
    {'label': 'Vehicle use policy', 'url': 'https://www.junkhaul.ca/vehicle-use-policy'},
    {'label': 'Code of conduct', 'url': 'https://www.junkhaul.ca/code-of-conduct'},
    {'label': 'Uniform policy', 'url': 'https://www.junkhaul.ca/uniform-policy'},
  ];

  Future<void> _openPolicy(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
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
              const Text('Acknowledgments', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
              const SizedBox(height: 6),
              const Text('Four short policies. Give them a read.', style: TextStyle(fontSize: 14, color: AppColors.textSecondary)),
              const SizedBox(height: 18),
              Container(
                decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.borderSubtle)),
                clipBehavior: Clip.antiAlias,
                child: Column(
                  children: [
                    for (var i = 0; i < _policies.length; i++)
                      Container(
                        decoration: BoxDecoration(
                          border: i == _policies.length - 1 ? null : const Border(bottom: BorderSide(color: AppColors.borderSubtle)),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(_policies[i]['label']!, style: const TextStyle(fontSize: 14, color: AppColors.textPrimary)),
                            GestureDetector(
                              onTap: () => _openPolicy(_policies[i]['url']!),
                              child: const Text('View', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.accent)),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              CheckboxListTile(
                value: _agree,
                onChanged: (v) => setState(() => _agree = v ?? false),
                controlAffinity: ListTileControlAffinity.leading,
                contentPadding: EdgeInsets.zero,
                activeColor: AppColors.accent,
                title: const Text("I've read and agree to all four policies above.",
                    style: TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.4)),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 26),
          child: JhPrimaryButton(label: 'Continue', onPressed: _agree ? widget.onNext : null),
        ),
      ],
    );
  }
}
