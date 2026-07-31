import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';

import '../../core/auth/account_controller.dart';
import '../../core/network/mathsolver_api.dart';
import '../../core/network/video_lesson_api.dart';
import '../../core/theme/app_theme.dart';
import '../app/app_controller.dart';
import '../notebook/notebook_screen.dart';
import '../practice/presentation/practice_screen.dart';
import '../profile/profile_screen.dart';
import '../solve/presentation/solve_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({
    super.key,
    required this.controller,
    required this.api,
    required this.account,
    required this.videoApi,
  });

  final AppController controller;
  final MathSolverApi api;
  final AccountController account;
  final VideoLessonApi videoApi;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  var _selectedIndex = 0;

  List<NavigationDestination> _destinations(int dueReviews) => [
    const NavigationDestination(
      icon: Icon(Icons.home_outlined),
      selectedIcon: Icon(Icons.home_rounded),
      label: 'Home',
    ),
    const NavigationDestination(
      icon: Icon(Icons.bookmarks_outlined),
      selectedIcon: Icon(Icons.bookmarks_rounded),
      label: 'Library',
    ),
    NavigationDestination(
      icon: Badge(
        isLabelVisible: dueReviews > 0,
        label: Text('$dueReviews'),
        child: const Icon(Icons.bolt_outlined),
      ),
      selectedIcon: Badge(
        isLabelVisible: dueReviews > 0,
        label: Text('$dueReviews'),
        child: const Icon(Icons.bolt_rounded),
      ),
      label: 'Practice',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final screens = [
      SolveScreen(
        controller: widget.controller,
        api: widget.api,
        account: widget.account,
        videoApi: widget.videoApi,
        onOpenProfile: _openProfile,
        onOpenLibrary: () => _select(1),
      ),
      NotebookScreen(
        controller: widget.controller,
        api: widget.api,
        account: widget.account,
        videoApi: widget.videoApi,
        onOpenProfile: _openProfile,
      ),
      PracticeScreen(
        controller: widget.controller,
        api: widget.api,
        onOpenProfile: _openProfile,
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final useRail = constraints.maxWidth >= 900;
        final content = IndexedStack(index: _selectedIndex, children: screens);

        if (useRail) {
          return Scaffold(
            body: SafeArea(
              child: Row(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(14),
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: Theme.of(
                          context,
                        ).colorScheme.surfaceContainerLow,
                        borderRadius: BorderRadius.circular(28),
                      ),
                      child: NavigationRail(
                        extended: constraints.maxWidth >= 1180,
                        selectedIndex: _selectedIndex,
                        onDestinationSelected: _select,
                        leading: Padding(
                          padding: const EdgeInsets.only(top: 12, bottom: 24),
                          child: _BrandMark(
                            showLabel: constraints.maxWidth >= 1180,
                          ),
                        ),
                        trailing: Expanded(
                          child: Align(
                            alignment: Alignment.bottomCenter,
                            child: Padding(
                              padding: const EdgeInsets.only(bottom: 14),
                              child: IconButton(
                                tooltip: 'Profile and settings',
                                onPressed: _openProfile,
                                icon: const Icon(Icons.person_outline_rounded),
                              ),
                            ),
                          ),
                        ),
                        destinations:
                            _destinations(
                                  widget.controller.dueReviewItems.length,
                                )
                                .map(
                                  (item) => NavigationRailDestination(
                                    icon: item.icon,
                                    selectedIcon: item.selectedIcon,
                                    label: Text(item.label),
                                  ),
                                )
                                .toList(growable: false),
                      ),
                    ),
                  ),
                  Expanded(child: content),
                ],
              ),
            ),
          );
        }

        return Scaffold(
          extendBody: true,
          body: SafeArea(bottom: false, child: content),
          bottomNavigationBar: SafeArea(
            minimum: const EdgeInsets.fromLTRB(12, 0, 12, 8),
            child: DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(28),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.ink.withValues(alpha: 0.1),
                    blurRadius: 24,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(28),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
                  child: ColoredBox(
                    color: Theme.of(
                      context,
                    ).colorScheme.surfaceContainerLowest.withValues(alpha: 0.8),
                    child: ListenableBuilder(
                      listenable: widget.controller,
                      builder: (context, _) => NavigationBar(
                        selectedIndex: _selectedIndex,
                        onDestinationSelected: _select,
                        destinations: _destinations(
                          widget.controller.dueReviewItems.length,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  void _select(int index) {
    setState(() => _selectedIndex = index);
  }

  void _openProfile() {
    Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => ProfileScreen(
          controller: widget.controller,
          account: widget.account,
          videoApi: widget.videoApi,
        ),
      ),
    );
  }
}

class _BrandMark extends StatelessWidget {
  const _BrandMark({required this.showLabel});

  final bool showLabel;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: AppTheme.electric,
            borderRadius: BorderRadius.circular(15),
          ),
          alignment: Alignment.center,
          child: const Icon(Icons.functions_rounded, color: Colors.white),
        ),
        if (showLabel) ...[
          const SizedBox(width: 12),
          Text('MathSolver', style: Theme.of(context).textTheme.titleLarge),
        ],
      ],
    );
  }
}
