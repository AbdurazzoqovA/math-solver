import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/auth/account_controller.dart';
import '../../core/network/video_lesson_api.dart';
import '../../core/storage/video_offline_cache.dart';
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
                  builder: (context, _) => _AccountCard(
                    account: account,
                    videoApi: videoApi,
                    controller: controller,
                  ),
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
                        icon: Icons.privacy_tip_outlined,
                        color: Theme.of(context).colorScheme.primaryContainer,
                      ),
                      title: const Text('Privacy policy'),
                      trailing: const Icon(Icons.open_in_new_rounded),
                      onTap: () => _openWebPage(
                        context,
                        Uri.parse('https://math-solver.io/privacy'),
                      ),
                    ),
                    const Divider(indent: 74),
                    ListTile(
                      leading: _SettingsIcon(
                        icon: Icons.description_outlined,
                        color: Theme.of(context).colorScheme.secondaryContainer,
                      ),
                      title: const Text('Terms of use'),
                      trailing: const Icon(Icons.open_in_new_rounded),
                      onTap: () => _openWebPage(
                        context,
                        Uri.parse('https://math-solver.io/terms'),
                      ),
                    ),
                    const Divider(indent: 74),
                    ListTile(
                      leading: _SettingsIcon(
                        icon: Icons.person_remove_outlined,
                        color: Theme.of(context).colorScheme.errorContainer,
                      ),
                      title: const Text('Account deletion help'),
                      subtitle: const Text(
                        'Delete in the app or request help online',
                      ),
                      trailing: const Icon(Icons.open_in_new_rounded),
                      onTap: () => _openWebPage(
                        context,
                        Uri.parse('https://math-solver.io/account-deletion'),
                      ),
                    ),
                    const Divider(indent: 74),
                    ListTile(
                      leading: _SettingsIcon(
                        icon: Icons.info_outline_rounded,
                        color: Theme.of(context).colorScheme.tertiaryContainer,
                      ),
                      title: const Text('About MathSolver'),
                      subtitle: FutureBuilder<PackageInfo>(
                        future: PackageInfo.fromPlatform(),
                        builder: (context, snapshot) => Text(
                          snapshot.hasData
                              ? 'Version ${snapshot.data!.version}'
                              : 'Version information',
                        ),
                      ),
                      trailing: const Icon(Icons.chevron_right_rounded),
                      onTap: () => _showAbout(context),
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

  static Future<void> _openWebPage(BuildContext context, Uri url) async {
    final opened = await launchUrl(url, mode: LaunchMode.externalApplication);
    if (!opened && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('This page could not be opened.')),
      );
    }
  }

  static Future<void> _showAbout(BuildContext context) async {
    final packageInfo = await PackageInfo.fromPlatform();
    if (!context.mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (context) => _MathSolverAboutSheet(
        version: packageInfo.version,
        buildNumber: packageInfo.buildNumber,
      ),
    );
  }
}

class _MathSolverAboutSheet extends StatelessWidget {
  const _MathSolverAboutSheet({
    required this.version,
    required this.buildNumber,
  });

  final String version;
  final String buildNumber;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(24, 4, 24, 28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 68,
            height: 68,
            decoration: BoxDecoration(
              color: AppTheme.mint,
              borderRadius: BorderRadius.circular(22),
            ),
            alignment: Alignment.center,
            child: const Icon(
              Icons.functions_rounded,
              color: AppTheme.ink,
              size: 38,
            ),
          ),
          const SizedBox(height: 16),
          Text('MathSolver', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 4),
          Text(
            'Version $version ($buildNumber)',
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: colors.onSurfaceVariant),
          ),
          const SizedBox(height: 18),
          Text(
            'Scan, solve, and understand math with clear steps, work checking, practice, and personal video lessons.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyLarge,
          ),
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.mintCard(colors),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              'Completely free. Written solutions, Check My Work, practice, and your notebook are unlimited. Create up to 10 video lessons each day.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppTheme.onMintCard(colors),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(height: 14),
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 4,
            children: [
              TextButton(
                onPressed: () => ProfileScreen._openWebPage(
                  context,
                  Uri.parse('https://math-solver.io/privacy'),
                ),
                child: const Text('Privacy'),
              ),
              TextButton(
                onPressed: () => ProfileScreen._openWebPage(
                  context,
                  Uri.parse('https://math-solver.io/terms'),
                ),
                child: const Text('Terms'),
              ),
              TextButton(
                onPressed: () => ProfileScreen._openWebPage(
                  context,
                  Uri.parse('mailto:support@math-solver.io'),
                ),
                child: const Text('Support'),
              ),
            ],
          ),
          const SizedBox(height: 6),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Done'),
            ),
          ),
        ],
      ),
    );
  }
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
  const _AccountCard({
    required this.account,
    required this.videoApi,
    required this.controller,
  });

  final AccountController account;
  final VideoLessonApi videoApi;
  final AppController controller;

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
        child: Column(
          children: [
            Row(
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
                        account.email ?? 'Private Apple account',
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
                  onPressed: account.isBusy
                      ? null
                      : () async {
                          await videoApi.disableReadyNotifications();
                          await account.signOut();
                        },
                  style: TextButton.styleFrom(foregroundColor: mintForeground),
                  child: const Text('Sign out'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: account.isBusy
                    ? null
                    : () => _confirmAccountDeletion(context),
                style: TextButton.styleFrom(
                  foregroundColor: Theme.of(context).colorScheme.error,
                ),
                child: const Text('Delete account and data'),
              ),
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

  Future<void> _confirmAccountDeletion(BuildContext context) async {
    final password = await showDialog<String>(
      context: context,
      builder: (context) => _AccountDeletionDialog(
        reauthenticationMethod: account.reauthenticationMethod,
      ),
    );
    if (password == null || !context.mounted) return;

    try {
      await account.reauthenticateForDeletion(password);
      await videoApi.disableReadyNotifications();
      await account.deleteAccount();
      await VideoOfflineCache.clearAll();
      await controller.clearPersonalData();
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Your account and data were deleted.')),
        );
      }
    } on AccountException catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }
}

class _AccountDeletionDialog extends StatefulWidget {
  const _AccountDeletionDialog({required this.reauthenticationMethod});

  final AccountReauthenticationMethod reauthenticationMethod;

  @override
  State<_AccountDeletionDialog> createState() => _AccountDeletionDialogState();
}

class _AccountDeletionDialogState extends State<_AccountDeletionDialog> {
  final _passwordController = TextEditingController();
  var _obscurePassword = true;

  @override
  void dispose() {
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final needsPassword =
        widget.reauthenticationMethod == AccountReauthenticationMethod.password;
    return AlertDialog(
      title: const Text('Delete your account?'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'This permanently deletes your account, synced solutions, private videos, and notification registration. This cannot be undone.',
          ),
          const SizedBox(height: 16),
          if (needsPassword)
            TextField(
              controller: _passwordController,
              obscureText: _obscurePassword,
              autofocus: true,
              autocorrect: false,
              enableSuggestions: false,
              decoration: InputDecoration(
                labelText: 'Confirm your password',
                suffixIcon: IconButton(
                  onPressed: () =>
                      setState(() => _obscurePassword = !_obscurePassword),
                  icon: Icon(
                    _obscurePassword
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                  ),
                ),
              ),
              onChanged: (_) => setState(() {}),
            )
          else
            Text(_providerConfirmationText),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Keep account'),
        ),
        FilledButton(
          onPressed: needsPassword && _passwordController.text.isEmpty
              ? null
              : () => Navigator.pop(
                  context,
                  needsPassword ? _passwordController.text : '',
                ),
          style: FilledButton.styleFrom(
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
          child: const Text('Delete permanently'),
        ),
      ],
    );
  }

  String get _providerConfirmationText =>
      switch (widget.reauthenticationMethod) {
        AccountReauthenticationMethod.apple =>
          'Apple will ask you to confirm your identity before deletion.',
        AccountReauthenticationMethod.google =>
          'Google will ask you to confirm your identity before deletion.',
        AccountReauthenticationMethod.password => '',
      };
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
