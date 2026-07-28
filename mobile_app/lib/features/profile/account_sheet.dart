import 'package:flutter/material.dart';

import '../../core/auth/account_controller.dart';
import '../../core/theme/app_theme.dart';

Future<bool> showAccountSheet(
  BuildContext context, {
  required AccountController account,
}) async {
  return await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        builder: (context) => AccountSheet(account: account),
      ) ??
      false;
}

enum _AccountMode { signIn, create, reset }

class AccountSheet extends StatefulWidget {
  const AccountSheet({super.key, required this.account});

  final AccountController account;

  @override
  State<AccountSheet> createState() => _AccountSheetState();
}

class _AccountSheetState extends State<AccountSheet> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  var _mode = _AccountMode.signIn;
  String? _error;
  String? _notice;
  var _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final needsPassword = _mode != _AccountMode.reset;
    return AnimatedPadding(
      duration: const Duration(milliseconds: 180),
      padding: EdgeInsets.fromLTRB(
        20,
        4,
        20,
        24 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: AppTheme.mint,
                  borderRadius: BorderRadius.circular(19),
                ),
                alignment: Alignment.center,
                child: Icon(
                  _mode == _AccountMode.reset
                      ? Icons.lock_reset_rounded
                      : Icons.cloud_done_outlined,
                  color: AppTheme.ink,
                  size: 31,
                ),
              ),
              const SizedBox(height: 18),
              Text(_title, style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 8),
              Text(
                _body,
                style: Theme.of(
                  context,
                ).textTheme.bodyLarge?.copyWith(color: colors.onSurfaceVariant),
              ),
              const SizedBox(height: 24),
              TextFormField(
                controller: _emailController,
                autofocus: true,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.email],
                textInputAction: needsPassword
                    ? TextInputAction.next
                    : TextInputAction.done,
                onFieldSubmitted: needsPassword ? null : (_) => _submit(),
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.mail_outline_rounded),
                ),
                validator: (value) {
                  final email = value?.trim() ?? '';
                  return email.contains('@') ? null : 'Enter your email.';
                },
              ),
              if (needsPassword) ...[
                const SizedBox(height: 12),
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  autofillHints: _mode == _AccountMode.create
                      ? const [AutofillHints.newPassword]
                      : const [AutofillHints.password],
                  textInputAction: TextInputAction.done,
                  onFieldSubmitted: (_) => _submit(),
                  decoration: InputDecoration(
                    labelText: 'Password',
                    prefixIcon: const Icon(Icons.lock_outline_rounded),
                    suffixIcon: IconButton(
                      tooltip: _obscurePassword
                          ? 'Show password'
                          : 'Hide password',
                      onPressed: () =>
                          setState(() => _obscurePassword = !_obscurePassword),
                      icon: Icon(
                        _obscurePassword
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                      ),
                    ),
                  ),
                  validator: (value) {
                    final password = value ?? '';
                    if (password.isEmpty) return 'Enter your password.';
                    if (_mode == _AccountMode.create && password.length < 6) {
                      return 'Use at least 6 characters.';
                    }
                    return null;
                  },
                ),
              ],
              if (_error != null) ...[
                const SizedBox(height: 14),
                _MessageBox(
                  text: _error!,
                  color: colors.errorContainer,
                  foreground: colors.onErrorContainer,
                ),
              ],
              if (_notice != null) ...[
                const SizedBox(height: 14),
                _MessageBox(
                  text: _notice!,
                  color: AppTheme.mint,
                  foreground: AppTheme.ink,
                ),
              ],
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: ListenableBuilder(
                  listenable: widget.account,
                  builder: (context, _) {
                    return FilledButton(
                      onPressed: widget.account.isBusy ? null : _submit,
                      child: widget.account.isBusy
                          ? const SizedBox.square(
                              dimension: 22,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(_primaryLabel),
                    );
                  },
                ),
              ),
              if (_mode == _AccountMode.signIn) ...[
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    TextButton(
                      onPressed: () => _switchMode(_AccountMode.reset),
                      child: const Text('Forgot password?'),
                    ),
                    TextButton(
                      onPressed: () => _switchMode(_AccountMode.create),
                      child: const Text('Create account'),
                    ),
                  ],
                ),
                Center(
                  child: TextButton(
                    onPressed: widget.account.isBusy
                        ? null
                        : _resendVerification,
                    child: const Text('Resend verification email'),
                  ),
                ),
              ] else
                Center(
                  child: TextButton(
                    onPressed: () => _switchMode(_AccountMode.signIn),
                    child: const Text('Back to sign in'),
                  ),
                ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.verified_user_outlined, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Your photos and problem text never enter analytics.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String get _title => switch (_mode) {
    _AccountMode.signIn => 'Keep your lessons private',
    _AccountMode.create => 'Create your MathSolver account',
    _AccountMode.reset => 'Reset your password',
  };

  String get _body => switch (_mode) {
    _AccountMode.signIn =>
      'Sign in with a verified account to generate private videos and keep them in your library.',
    _AccountMode.create =>
      'Full written solutions stay free. An account keeps private videos and future sync under your control.',
    _AccountMode.reset =>
      'If an account exists for this email, we will send a secure reset link.',
  };

  String get _primaryLabel => switch (_mode) {
    _AccountMode.signIn => 'Sign in & continue',
    _AccountMode.create => 'Create account',
    _AccountMode.reset => 'Send reset link',
  };

  void _switchMode(_AccountMode mode) {
    setState(() {
      _mode = mode;
      _error = null;
      _notice = null;
    });
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _error = null;
      _notice = null;
    });
    try {
      switch (_mode) {
        case _AccountMode.signIn:
          await widget.account.signIn(
            email: _emailController.text,
            password: _passwordController.text,
          );
          if (mounted) Navigator.pop(context, true);
          break;
        case _AccountMode.create:
          await widget.account.createAccount(
            email: _emailController.text,
            password: _passwordController.text,
          );
          if (mounted) {
            setState(() {
              _mode = _AccountMode.signIn;
              _notice =
                  'Account created. Open the verification email, then sign in.';
            });
          }
          break;
        case _AccountMode.reset:
          await widget.account.sendPasswordReset(_emailController.text);
          if (mounted) {
            setState(() {
              _mode = _AccountMode.signIn;
              _notice =
                  'If that account exists, a password reset link is on its way.';
            });
          }
          break;
      }
    } on AccountException catch (error) {
      if (mounted) setState(() => _error = error.message);
    }
  }

  Future<void> _resendVerification() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _error = null;
      _notice = null;
    });
    try {
      await widget.account.resendVerification(
        email: _emailController.text,
        password: _passwordController.text,
      );
      if (mounted) {
        setState(() => _notice = 'A fresh verification email is on its way.');
      }
    } on AccountException catch (error) {
      if (mounted) setState(() => _error = error.message);
    }
  }
}

class _MessageBox extends StatelessWidget {
  const _MessageBox({
    required this.text,
    required this.color,
    required this.foreground,
  });

  final String text;
  final Color color;
  final Color foreground;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(
        text,
        style: Theme.of(
          context,
        ).textTheme.bodyMedium?.copyWith(color: foreground),
      ),
    );
  }
}
