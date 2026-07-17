import 'package:flutter/material.dart';
import '../../../shared/jh_primary_button.dart';
import '../../../shared/jh_text_field.dart';

/// Step 1 — legal name & contact info (must match ID for later steps).
///
/// TODO(dev): wire controllers to your form/validation layer and persist
/// on [onNext] before advancing.
class AccountStep extends StatelessWidget {
  const AccountStep({super.key, required this.onNext});

  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
            children: const [
              Text('Your account', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
              SizedBox(height: 6),
              Text('Legal name — it has to match your ID.', style: TextStyle(fontSize: 14, color: Color(0xFF6B6B6B))),
              SizedBox(height: 20),
              JhTextField(label: 'Legal first name', hint: 'First name'),
              SizedBox(height: 14),
              JhTextField(label: 'Legal last name', hint: 'Last name'),
              SizedBox(height: 14),
              JhTextField(label: 'Mobile number', hint: '(403) 555-0134', keyboardType: TextInputType.phone),
              SizedBox(height: 14),
              JhTextField(label: 'Emergency contact', hint: 'Name and phone number'),
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
