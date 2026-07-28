import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key, required this.onComplete});

  final Future<void> Function() onComplete;

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  var _ageConfirmed = false;
  var _isCompleting = false;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(22, 20, 22, 28),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 620),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 46,
                        height: 46,
                        decoration: BoxDecoration(
                          color: AppTheme.electric,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        alignment: Alignment.center,
                        child: const Icon(
                          Icons.functions_rounded,
                          color: Colors.white,
                          size: 26,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        'MathSolver',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                    ],
                  ),
                  const SizedBox(height: 34),
                  Text(
                    'Math finally\nclicks.',
                    style: Theme.of(
                      context,
                    ).textTheme.displaySmall?.copyWith(fontSize: 50),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    'Scan a problem, understand every step, then watch a lesson made for your exact question.',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: colors.onSurfaceVariant,
                      fontSize: 18,
                    ),
                  ),
                  const SizedBox(height: 30),
                  const _PromiseStrip(),
                  const SizedBox(height: 28),
                  Row(
                    children: [
                      const Expanded(
                        child: _FeatureTile(
                          icon: Icons.menu_book_rounded,
                          color: AppTheme.mint,
                          title: 'Every step',
                          body: 'Free and unlimited',
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _FeatureTile(
                          icon: Icons.play_arrow_rounded,
                          color: colors.primaryContainer,
                          title: 'Your video',
                          body: 'Animated & narrated',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 26),
                  Material(
                    color: colors.surfaceContainerLow,
                    borderRadius: BorderRadius.circular(20),
                    child: CheckboxListTile(
                      value: _ageConfirmed,
                      onChanged: (value) {
                        setState(() => _ageConfirmed = value ?? false);
                      },
                      controlAffinity: ListTileControlAffinity.leading,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                      title: const Text('I am 13 or older'),
                      subtitle: const Text(
                        'Camera access is requested only when you tap Scan.',
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      key: const Key('onboarding-continue'),
                      onPressed: !_ageConfirmed || _isCompleting
                          ? null
                          : _complete,
                      child: _isCompleting
                          ? const SizedBox.square(
                              dimension: 22,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Start solving'),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Center(
                    child: Text(
                      'No account required · no trial traps',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _complete() async {
    setState(() => _isCompleting = true);
    await widget.onComplete();
    if (mounted) {
      setState(() => _isCompleting = false);
    }
  }
}

class _PromiseStrip extends StatelessWidget {
  const _PromiseStrip();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 15),
      decoration: BoxDecoration(
        color: AppTheme.ink,
        borderRadius: BorderRadius.circular(22),
      ),
      child: const Row(
        children: [
          _Promise(icon: Icons.camera_alt_rounded, label: 'Scan'),
          _Arrow(),
          _Promise(icon: Icons.lightbulb_rounded, label: 'Understand'),
          _Arrow(),
          _Promise(icon: Icons.play_circle_rounded, label: 'Watch'),
        ],
      ),
    );
  }
}

class _Promise extends StatelessWidget {
  const _Promise({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white, size: 24),
          const SizedBox(height: 6),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _Arrow extends StatelessWidget {
  const _Arrow();

  @override
  Widget build(BuildContext context) {
    return Icon(
      Icons.arrow_forward_rounded,
      color: Colors.white.withValues(alpha: 0.45),
      size: 18,
    );
  }
}

class _FeatureTile extends StatelessWidget {
  const _FeatureTile({
    required this.icon,
    required this.color,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(17),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(22),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(14),
            ),
            alignment: Alignment.center,
            child: Icon(icon, color: AppTheme.ink),
          ),
          const SizedBox(height: 14),
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 3),
          Text(
            body,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}
