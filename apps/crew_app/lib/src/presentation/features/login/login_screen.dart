import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/app_theme.dart';
import '../../../data/api/api_result.dart';
import '../../../data/repositories/auth_repository.dart';
import '../../shared/jh_error_banner.dart';
import '../../shared/jh_primary_button.dart';
import '../../shared/jh_text_field.dart';

/// Email + password login. Posts to /api/employee/login and persists the
/// session cookie via [AuthRepository].
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    if (email.isEmpty || password.isEmpty) {
      setState(() => _errorMessage = 'Email and password are required.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await ref.read(authRepositoryProvider.notifier).login(
            email: email,
            password: password,
          );
      // Router redirect will handle navigation.
    } on AuthException catch (e) {
      setState(() => _errorMessage = e.message);
    } on NetworkException catch (e) {
      setState(() => _errorMessage = e.message);
    } catch (_) {
      setState(() => _errorMessage = 'Login failed. Please try again.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgBase,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 32),
              const Icon(Icons.local_shipping_rounded, size: 56, color: AppColors.accent),
              const SizedBox(height: 16),
              Text('Junkhaul Crew', style: Theme.of(context).textTheme.headlineSmall, textAlign: TextAlign.center),
              const SizedBox(height: 8),
              Text(
                'Sign in to your crew account',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 40),
              JhTextField(
                controller: _emailController,
                label: 'Email',
                keyboardType: TextInputType.emailAddress,
                autocorrect: false,
              ),
              const SizedBox(height: 16),
              JhTextField(
                controller: _passwordController,
                label: 'Password',
                obscureText: true,
                autocorrect: false,
              ),
              if (_errorMessage != null) ...[
                const SizedBox(height: 16),
                JhErrorBanner(message: _errorMessage!),
              ],
              const SizedBox(height: 24),
              JhPrimaryButton(
                label: 'Sign In',
                isLoading: _isLoading,
                onPressed: _handleLogin,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
