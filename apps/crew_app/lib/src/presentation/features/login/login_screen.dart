import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/app_theme.dart';
import '../../../data/api/api_result.dart';
import '../../../data/repositories/auth_repository.dart';
import '../../shared/jh_primary_button.dart';
import '../../shared/jh_text_field.dart';

/// Crew sign-in — the daily entry point. Wired to [AuthRepository].
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phoneController = TextEditingController();
  final _pinController = TextEditingController();
  bool _isLoading = false;
  String? _errorText;

  @override
  void dispose() {
    _phoneController.dispose();
    _pinController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = _phoneController.text.trim();
    final password = _pinController.text;

    if (email.isEmpty || password.isEmpty) {
      setState(() => _errorText = 'Enter your email and password.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorText = null;
    });

    try {
      await ref
          .read(authRepositoryProvider.notifier)
          .login(email: email, password: password);
      // Router redirect handles navigation on success.
    } on AuthException {
      setState(() => _errorText = 'Invalid credentials. Try again.');
    } on NetworkException {
      setState(
        () => _errorText = 'No connection. Check your network and try again.',
      );
    } catch (_) {
      setState(() => _errorText = 'Something went wrong. Try again.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgBase,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: AppColors.accent,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(
                  Icons.local_shipping_outlined,
                  color: Colors.white,
                  size: 26,
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'Junkhaul Crew',
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Sign in to see your day.',
                style: TextStyle(fontSize: 15, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 28),
              JhTextField(
                label: 'Email',
                hint: 'crew@junkhaul.ca',
                controller: _phoneController,
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 14),
              JhTextField(
                label: 'Password',
                hint: '••••••••',
                controller: _pinController,
                obscureText: true,
              ),
              if (_errorText != null) ...[
                const SizedBox(height: 12),
                Text(
                  _errorText!,
                  style: const TextStyle(
                    color: AppColors.statusRed,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
              const Spacer(),
              JhPrimaryButton(
                label: 'Sign In',
                isLoading: _isLoading,
                onPressed: _submit,
              ),
              const SizedBox(height: 14),
              Center(
                child: GestureDetector(
                  onTap: () async {
                    final uri = Uri.parse('tel:5873254317');
                    if (await canLaunchUrl(uri)) await launchUrl(uri);
                  },
                  child: RichText(
                    text: const TextSpan(
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                      children: [
                        TextSpan(text: "Forgot your password? "),
                        TextSpan(
                          text: 'Call dispatch',
                          style: TextStyle(
                            color: AppColors.accent,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
