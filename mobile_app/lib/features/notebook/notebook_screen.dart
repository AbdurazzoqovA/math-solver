import 'package:flutter/material.dart';

import '../../core/auth/account_controller.dart';
import '../../core/network/mathsolver_api.dart';
import '../../core/network/video_lesson_api.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/math_text.dart';
import '../../core/widgets/screen_layout.dart';
import '../app/app_controller.dart';
import '../solve/domain/solution_record.dart';
import '../solve/presentation/solution_screen.dart';
import '../video/presentation/video_library_panel.dart';
import '../video/presentation/video_studio_screen.dart';

enum _LibrarySection { solutions, videos }

class NotebookScreen extends StatefulWidget {
  const NotebookScreen({
    super.key,
    required this.controller,
    required this.api,
    required this.account,
    required this.videoApi,
    required this.onOpenProfile,
  });

  final AppController controller;
  final MathSolverApi api;
  final AccountController account;
  final VideoLessonApi videoApi;
  final VoidCallback onOpenProfile;

  @override
  State<NotebookScreen> createState() => _NotebookScreenState();
}

class _NotebookScreenState extends State<NotebookScreen> {
  final _searchController = TextEditingController();
  var _query = '';
  var _section = _LibrarySection.solutions;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final solutions = widget.controller.solutions
        .where((record) {
          return _query.isEmpty ||
              record.problem.toLowerCase().contains(_query.toLowerCase());
        })
        .toList(growable: false);

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: SingleChildScrollView(
          child: ScreenLayout(
            maxWidth: 820,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Library',
                            style: Theme.of(context).textTheme.headlineMedium,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Steps and videos, together.',
                            style: Theme.of(context).textTheme.bodyLarge
                                ?.copyWith(
                                  color: Theme.of(
                                    context,
                                  ).colorScheme.onSurfaceVariant,
                                ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: 'Profile and settings',
                      onPressed: widget.onOpenProfile,
                      style: IconButton.styleFrom(
                        backgroundColor: Theme.of(
                          context,
                        ).colorScheme.surfaceContainerLow,
                      ),
                      icon: const Icon(Icons.person_outline_rounded),
                    ),
                  ],
                ),
                const SizedBox(height: 22),
                SizedBox(
                  width: double.infinity,
                  child: SegmentedButton<_LibrarySection>(
                    showSelectedIcon: false,
                    segments: const [
                      ButtonSegment(
                        value: _LibrarySection.solutions,
                        icon: Icon(Icons.notes_rounded),
                        label: Text('Solutions'),
                      ),
                      ButtonSegment(
                        value: _LibrarySection.videos,
                        icon: Icon(Icons.play_circle_outline_rounded),
                        label: Text('Videos'),
                      ),
                    ],
                    selected: {_section},
                    onSelectionChanged: (value) {
                      setState(() => _section = value.first);
                    },
                  ),
                ),
                const SizedBox(height: 20),
                if (_section == _LibrarySection.solutions) ...[
                  TextField(
                    controller: _searchController,
                    onChanged: (value) => setState(() => _query = value.trim()),
                    textInputAction: TextInputAction.search,
                    decoration: InputDecoration(
                      hintText: 'Search your solved problems',
                      prefixIcon: const Icon(Icons.search_rounded),
                      suffixIcon: _query.isEmpty
                          ? null
                          : IconButton(
                              tooltip: 'Clear search',
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _query = '');
                              },
                              icon: const Icon(Icons.close_rounded),
                            ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  if (solutions.isEmpty)
                    _SolutionEmpty(hasQuery: _query.isNotEmpty)
                  else
                    for (final record in solutions) ...[
                      _SolutionTile(
                        record: record,
                        onTap: () => _openSaved(record),
                        onDelete: () => _delete(record),
                      ),
                      const SizedBox(height: 10),
                    ],
                ] else
                  VideoLibraryPanel(
                    account: widget.account,
                    api: widget.videoApi,
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _openSaved(SolutionRecord record) {
    return Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => SavedSolutionScreen(
          record: record,
          controller: widget.controller,
          api: widget.api,
          account: widget.account,
          videoApi: widget.videoApi,
        ),
      ),
    );
  }

  Future<void> _delete(SolutionRecord record) async {
    final shouldDelete = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove this solution?'),
        content: const Text(
          'The generated video, if any, stays in your private video library.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Keep'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (shouldDelete == true) {
      await widget.controller.removeSolution(record.id);
    }
  }
}

class _SolutionTile extends StatelessWidget {
  const _SolutionTile({
    required this.record,
    required this.onTap,
    required this.onDelete,
  });

  final SolutionRecord record;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Material(
      color: colors.surfaceContainerLow,
      borderRadius: BorderRadius.circular(22),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 8, 14),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: _sourceColor(record.source, colors),
                  borderRadius: BorderRadius.circular(16),
                ),
                alignment: Alignment.center,
                child: Icon(_sourceIcon(record.source), color: AppTheme.ink),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      record.problem.replaceAll('\n', ' '),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 5),
                    Text(
                      '${record.source.label} · ${_friendlyDate(record.createdAt)}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              PopupMenuButton<String>(
                tooltip: 'Solution options',
                onSelected: (value) {
                  if (value == 'delete') {
                    onDelete();
                  }
                },
                itemBuilder: (context) => const [
                  PopupMenuItem(
                    value: 'delete',
                    child: Row(
                      children: [
                        Icon(Icons.delete_outline_rounded),
                        SizedBox(width: 10),
                        Text('Remove'),
                      ],
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

  static Color _sourceColor(ProblemSource source, ColorScheme colors) {
    return switch (source) {
      ProblemSource.camera => AppTheme.mint,
      ProblemSource.gallery => colors.tertiaryContainer,
      ProblemSource.typed => colors.primaryContainer,
      ProblemSource.followUp => colors.secondaryContainer,
    };
  }

  static IconData _sourceIcon(ProblemSource source) => switch (source) {
    ProblemSource.camera => Icons.camera_alt_outlined,
    ProblemSource.gallery => Icons.photo_outlined,
    ProblemSource.typed => Icons.keyboard_alt_outlined,
    ProblemSource.followUp => Icons.chat_bubble_outline_rounded,
  };
}

class _SolutionEmpty extends StatelessWidget {
  const _SolutionEmpty({required this.hasQuery});

  final bool hasQuery;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 64),
      child: Center(
        child: Column(
          children: [
            Container(
              width: 74,
              height: 74,
              decoration: BoxDecoration(
                color: colors.primaryContainer,
                borderRadius: BorderRadius.circular(25),
              ),
              alignment: Alignment.center,
              child: Icon(
                hasQuery ? Icons.search_off_rounded : Icons.notes_rounded,
                size: 34,
                color: colors.onPrimaryContainer,
              ),
            ),
            const SizedBox(height: 18),
            Text(
              hasQuery ? 'Nothing matches' : 'Your first solution goes here',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 6),
            Text(
              hasQuery
                  ? 'Try fewer words or a different symbol.'
                  : 'Solve a problem and it saves automatically.',
              textAlign: TextAlign.center,
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(color: colors.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }
}

class SavedSolutionScreen extends StatelessWidget {
  const SavedSolutionScreen({
    super.key,
    required this.record,
    required this.controller,
    required this.api,
    required this.account,
    required this.videoApi,
  });

  final SolutionRecord record;
  final AppController controller;
  final MathSolverApi api;
  final AccountController account;
  final VideoLessonApi videoApi;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Saved solution')),
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 760),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 120),
              children: [
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: colors.surfaceContainerLow,
                    borderRadius: BorderRadius.circular(22),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _friendlyDate(record.createdAt),
                        style: Theme.of(context).textTheme.labelMedium
                            ?.copyWith(
                              color: colors.primary,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const SizedBox(height: 9),
                      MathText(
                        record.problem,
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                SolutionContent(solution: record.solution),
              ],
            ),
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(14, 8, 14, 10),
        child: _SavedActionBar(
          onVideo: () => _openVideo(context),
          onExplain: () => _explainSimpler(context),
        ),
      ),
    );
  }

  Future<void> _openVideo(BuildContext context) {
    return Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => VideoStudioScreen(
          account: account,
          api: videoApi,
          problem: record.problem,
          solution: record.solution,
          requestKey: 'mobile-${record.id}',
        ),
      ),
    );
  }

  Future<void> _explainSimpler(BuildContext context) {
    return Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => SolutionScreen(
          problem: 'Explain this solution in a simpler way.',
          source: ProblemSource.followUp,
          controller: controller,
          api: api,
          account: account,
          videoApi: videoApi,
          saveToNotebook: false,
          priorMessages: [
            {'role': 'user', 'content': record.problem},
            {'role': 'assistant', 'content': record.solution},
            {
              'role': 'user',
              'content': 'Explain this solution in a simpler way.',
            },
          ],
        ),
      ),
    );
  }
}

class _SavedActionBar extends StatelessWidget {
  const _SavedActionBar({required this.onVideo, required this.onExplain});

  final VoidCallback onVideo;
  final VoidCallback onExplain;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: AppTheme.ink.withValues(alpha: 0.1),
            blurRadius: 22,
            offset: const Offset(0, 7),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: FilledButton.icon(
              onPressed: onVideo,
              icon: const Icon(Icons.play_arrow_rounded),
              label: const Text('Make video'),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: OutlinedButton(
              onPressed: onExplain,
              child: const Text('Simpler'),
            ),
          ),
        ],
      ),
    );
  }
}

String _friendlyDate(DateTime value) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final date = DateTime(value.year, value.month, value.day);
  if (date == today) {
    return 'Today';
  }
  if (date == today.subtract(const Duration(days: 1))) {
    return 'Yesterday';
  }
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return '${months[value.month - 1]} ${value.day}';
}
