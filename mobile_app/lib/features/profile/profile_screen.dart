import 'package:flutter/material.dart';

import '../../core/auth/account_controller.dart';
import '../../core/network/video_lesson_api.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/screen_layout.dart';
import '../app/app_controller.dart';
import 'account_sheet.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({
    super.key,
    required this.controller,
    required this.account,
    required this.videoApi,
  });

  final AppController controller;
  final AccountController account;
  final VideoLessonApi videoApi;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('You')),
      body: SafeArea(
        child: SingleChildScrollView(
          child: ScreenLayout(
            maxWidth: 720,
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 36),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _ProfileHero(
                  streak: controller.streakDays,
                  solved: controller.solutions.length,
                ),
                const SizedBox(height: 26),
                Text('Account', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 10),
                ListenableBuilder(
                  listenable: account,
                  builder: (context, _) =>
                      _AccountCard(account: account, videoApi: videoApi),
                ),
                const SizedBox(height: 26),
                Text('Learning', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 10),
                _SettingsGroup(
                  children: [
                    SwitchListTile(
                      value: controller.learningMode,
                      onChanged: controller.setLearningMode,
                      secondary: const _SettingsIcon(
                        icon: Icons.psychology_alt_outlined,
                        color: AppTheme.mint,
                      ),
                      title: const Text('Learning mode'),
                      subtitle: const Text('Reveal one step at a time'),
                    ),
                    const Divider(indent: 74),
                    ListTile(
                      leading: _SettingsIcon(
                        icon: Icons.wb_sunny_outlined,
                        color: Theme.of(context).colorScheme.primaryContainer,
                      ),
                      title: const Text('Appearance'),
                      subtitle: Text(_themeLabel(controller.themeMode)),
                      trailing: const Icon(Icons.chevron_right_rounded),
                      onTap: () => _chooseTheme(context),
                    ),
                  ],
                ),
                const SizedBox(height: 26),
                Text('Trust', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 10),
                _SettingsGroup(
                  children: [
                    const ListTile(
                      leading: _SettingsIcon(
                        icon: Icons.shield_outlined,
                        color: AppTheme.mint,
                      ),
                      title: Text('Private by design'),
                      subtitle: Text(
                        'No problem text, photos, answers, or identity in analytics',
                      ),
                    ),
                    const Divider(indent: 74),
                    SwitchListTile(
                      value: controller.analyticsEnabled,
                      onChanged: controller.setAnalyticsEnabled,
                      secondary: _SettingsIcon(
                        icon: Icons.analytics_outlined,
                        color: Theme.of(context).colorScheme.secondaryContainer,
                      ),
                      title: const Text('Share anonymous usage'),
                      subtitle: const Text(
                        'Optional. Never includes your math, photos, answers, or account',
                      ),
                    ),
                    const Divider(indent: 74),
                    ListTile(
                      leading: _SettingsIcon(
                        icon: Icons.info_outline_rounded,
                        color: Theme.of(context).colorScheme.tertiaryContainer,
                      ),
                      title: const Text('About MathSolver'),
                      subtitle: const Text('Version 1.0.0'),
                      trailing: const Icon(Icons.chevron_right_rounded),
                      onTap: () {
                        showAboutDialog(
                          context: context,
                          applicationName: 'MathSolver',
                          applicationVersion: '1.0.0',
                          applicationLegalese:
                              'Full step-by-step solutions. Free. Unlimited.',
                        );
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Center(
                  child: Text(
                    'No trial traps. Understanding is never paywalled.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _chooseTheme(BuildContext context) async {
    final selected = await showModalBottomSheet<ThemeMode>(
      context: context,
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Appearance',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 12),
              RadioGroup<ThemeMode>(
                groupValue: controller.themeMode,
                onChanged: (value) => Navigator.pop(context, value),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    for (final mode in [
                      ThemeMode.light,
                      ThemeMode.system,
                      ThemeMode.dark,
                    ])
                      RadioListTile<ThemeMode>(
                        value: mode,
                        title: Text(_themeLabel(mode)),
                      ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
    if (selected != null) {
      await controller.setThemeMode(selected);
    }
  }

  static String _themeLabel(ThemeMode mode) => switch (mode) {
    ThemeMode.light => 'Light (recommended)',
    ThemeMode.system => 'Match device',
    ThemeMode.dark => 'Dark',
  };
}

class _ProfileHero extends StatelessWidget {
  const _ProfileHero({required this.streak, required this.solved});

  final int streak;
  final int solved;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: AppTheme.ink,
        borderRadius: BorderRadius.circular(30),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: AppTheme.mint,
              borderRadius: BorderRadius.circular(18),
            ),
            alignment: Alignment.center,
            child: const Icon(Icons.auto_awesome_rounded, color: AppTheme.ink),
          ),
          const SizedBox(height: 20),
          const Text(
            'Quiet progress,\nreal understanding.',
            style: TextStyle(
              color: Colors.white,
              fontSize: 28,
              height: 1.08,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.7,
            ),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              _HeroStat(value: '$streak', label: 'day streak'),
              const SizedBox(width: 26),
              _HeroStat(value: '$solved', label: 'solutions'),
            ],
          ),
        ],
      ),
    );
  }
}

class _HeroStat extends StatelessWidget {
  const _HeroStat({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 25,
            fontWeight: FontWeight.w800,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.62),
            fontSize: 13,
          ),
        ),
      ],
    );
  }
}

class _AccountCard extends StatelessWidget {
  const _AccountCard({required this.account, required this.videoApi});

  final AccountController account;
  final VideoLessonApi videoApi;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    if (account.isSignedIn) {
      final mintForeground = AppTheme.onMintCard(colors);
      return Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppTheme.mintCard(colors),
          borderRadius: BorderRadius.circular(24),
        ),
        child: Row(
          children: [
            const CircleAvatar(
              radius: 24,
              backgroundColor: Colors.white,
              child: Icon(Icons.person_rounded, color: AppTheme.ink),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Verified account',
                    style: TextStyle(
                      color: mintForeground,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    account.email ?? '',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: mintForeground.withValues(alpha: 0.68),
                    ),
                  ),
                ],
              ),
            ),
            TextButton(
              onPressed: () async {
                await videoApi.disableReadyNotifications();
                await account.signOut();
              },
              style: TextButton.styleFrom(foregroundColor: mintForeground),
              child: const Text('Sign out'),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: colors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const _SettingsIcon(
                icon: Icons.cloud_done_outlined,
                color: AppTheme.mint,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Sync solutions and unlock private videos',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: FilledButton.tonalIcon(
              onPressed: () {
                if (account.isConfigured) {
                  showAccountSheet(context, account: account);
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text(
                        'Verified account access is unavailable in this preview build.',
                      ),
                    ),
                  );
                }
              },
              icon: const Icon(Icons.login_rounded),
              label: const Text('Sign in'),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Guest solving and full written steps never require an account.',
            style: Theme.of(
              context,
            ).textTheme.bodySmall?.copyWith(color: colors.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

class _SettingsGroup extends StatelessWidget {
  const _SettingsGroup({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Theme.of(context).colorScheme.surfaceContainerLow,
      borderRadius: BorderRadius.circular(24),
      clipBehavior: Clip.antiAlias,
      child: Column(children: children),
    );
  }
}

class _SettingsIcon extends StatelessWidget {
  const _SettingsIcon({required this.icon, required this.color});

  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(15),
      ),
      alignment: Alignment.center,
      child: Icon(icon, color: AppTheme.ink),
    );
  }
}
