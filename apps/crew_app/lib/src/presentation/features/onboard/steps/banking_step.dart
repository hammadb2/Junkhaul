import 'package:flutter/material.dart';
import '../../../shared/jh_primary_button.dart';
import '../../../shared/jh_text_field.dart';

/// Step 6 — direct deposit banking details.
///
/// TODO(dev): validate institution/transit/account numbers and persist
/// securely (do not log these fields).
class BankingStep extends StatelessWidget {
  const BankingStep({super.key, required this.onNext});

  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
            children: const [
              Text('Direct deposit', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
              SizedBox(height: 6),
              Text('Where we send your pay. From a void cheque or your banking app.', style: TextStyle(fontSize: 14, color: Color(0xFF6B6B6B))),
              SizedBox(height: 20),
              JhTextField(label: 'Institution number', hint: '003', keyboardType: TextInputType.number),
              SizedBox(height: 14),
              JhTextField(label: 'Transit number', hint: '12345', keyboardType: TextInputType.number),
              SizedBox(height: 14),
              JhTextField(label: 'Account number', hint: '1234567', keyboardType: TextInputType.number),
            ],
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
