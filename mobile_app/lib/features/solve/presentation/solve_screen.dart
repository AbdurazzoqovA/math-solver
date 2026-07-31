import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';

import '../../../core/auth/account_controller.dart';
import '../../../core/network/mathsolver_api.dart';
import '../../../core/network/video_lesson_api.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/math_text.dart';
import '../../../core/widgets/screen_layout.dart';
import '../../../core/widgets/text_entry_sheet.dart';
import '../../app/app_controller.dart';
import '../../video/presentation/video_studio_screen.dart';
import '../domain/math_review.dart';
import '../domain/solution_record.dart';
import 'camera_capture_screen.dart';
import 'check_work_screen.dart';
import 'solution_screen.dart';

class SolveScreen extends StatefulWidget {
  const SolveScreen({
    super.key,
    required this.controller,
    required this.api,
    required this.account,
    required this.videoApi,
    required this.onOpenProfile,
    required this.onOpenLibrary,
  });

  final AppController controller;
  final MathSolverApi api;
  final AccountController account;
  final VideoLessonApi videoApi;
  final VoidCallback onOpenProfile;
  final VoidCallback onOpenLibrary;

  @override
  State<SolveScreen> createState() => _SolveScreenState();
}

class _SolveScreenState extends State<SolveScreen> {
  final _imagePicker = ImagePicker();
  final _problemController = TextEditingController();
  var _isReading = false;

  @override
  void dispose() {
    _problemController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final latest = widget.controller.latestSolution;
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: SingleChildScrollView(
          child: ScreenLayout(
            maxWidth: 820,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _HomeHeader(onOpenProfile: widget.onOpenProfile),
                const SizedBox(height: 30),
                Text(
                  'What are we\nsolving?',
                  style: Theme.of(context).textTheme.displaySmall,
                ),
                const SizedBox(height: 10),
                Text(
                  'Point, type, or paste. Full steps stay free.',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: colors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 24),
                _ScanHero(isBusy: _isReading, onTap: _openCamera),
                const SizedBox(height: 14),
                _QuickInputCard(
                  controller: _problemController,
                  enabled: !_isReading,
                  onSolve: _solveTyped,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _QuickAction(
                        icon: Icons.photo_library_outlined,
                        label: 'Choose photo',
                        onTap: _isReading ? null : _importPhoto,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _QuickAction(
                        icon: Icons.fact_check_outlined,
                        label: 'Check my work',
                        onTap: _isReading ? null : _openCheckMyWork,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton.icon(
                    onPressed: _isReading ? null : _openPasteSheet,
                    icon: const Icon(Icons.content_paste_go_rounded),
                    label: const Text('Paste a longer problem'),
                  ),
                ),
                if (_isReading) ...[
                  const SizedBox(height: 18),
                  const _ReadingStatus(),
                ],
                const SizedBox(height: 30),
                _VideoPromise(onTap: latest == null ? null : _openLatestVideo),
                const SizedBox(height: 30),
                Row(
                  children: [
                    Text(
                      'Recent',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const Spacer(),
                    if (latest != null)
                      TextButton(
                        onPressed: widget.onOpenLibrary,
                        child: const Text('See library'),
                      ),
                  ],
                ),
                const SizedBox(height: 10),
                if (latest == null)
                  const _NoRecent()
                else
                  _RecentSolution(record: latest, onTap: _openLatestSolution),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _openCamera() async {
    final bytes = await Navigator.of(context).push<Uint8List>(
      MaterialPageRoute(builder: (_) => const CameraCaptureScreen()),
    );
    if (bytes != null && mounted) {
      await _readImage(bytes: bytes, source: ProblemSource.camera);
    }
  }

  Future<void> _importPhoto() async {
    final file = await _imagePicker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 92,
    );
    if (file == null) {
      return;
    }
    await _readImage(
      bytes: await file.readAsBytes(),
      source: ProblemSource.gallery,
    );
  }

  Future<void> _openCheckMyWork() async {
    final source = await showModalBottomSheet<_WorkImageSource>(
      context: context,
      useSafeArea: true,
      builder: (context) => const _CheckWorkSourceSheet(),
    );
    if (source == null || !mounted) return;

    Uint8List? bytes;
    if (source == _WorkImageSource.camera) {
      bytes = await Navigator.of(context).push<Uint8List>(
        MaterialPageRoute(
          builder: (_) => const CameraCaptureScreen(
            instruction: 'Frame the problem and every handwritten line',
          ),
        ),
      );
    } else {
      final file = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 94,
      );
      if (file != null) bytes = await file.readAsBytes();
    }
    if (bytes == null || !mounted) return;
    final prepared = await _cropImage(bytes);
    if (prepared == null || !mounted) return;

    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => CheckWorkScreen(
          bytes: prepared,
          mimeType: 'image/jpeg',
          api: widget.api,
          onExplain: _explainWorkReview,
        ),
      ),
    );
  }

  Future<void> _explainWorkReview(WorkCheckResult result) async {
    final mistake = result.firstMistake;
    final focus = mistake == null
        ? result.nextHint
        : 'The student wrote "${mistake.transcription}". '
              '${mistake.explanation} '
              '${mistake.correction == null ? '' : 'A possible correction is "${mistake.correction}".'}';
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => SolutionScreen(
          problem:
              'Teach me how to fix this handwritten attempt without skipping steps.\n'
              'Original problem: ${result.problem}\n'
              'Focus: $focus',
          source: ProblemSource.followUp,
          controller: widget.controller,
          api: widget.api,
          account: widget.account,
          videoApi: widget.videoApi,
          saveToNotebook: false,
        ),
      ),
    );
  }

  Future<void> _readImage({
    required Uint8List bytes,
    required ProblemSource source,
  }) async {
    final prepared = await _cropImage(bytes);
    if (prepared == null || !mounted) return;
    setState(() => _isReading = true);
    try {
      final problem = await widget.api.extractProblem(
        bytes: prepared,
        mimeType: 'image/jpeg',
        source: source == ProblemSource.camera ? 'camera' : 'upload',
      );
      if (!mounted) {
        return;
      }
      final selectedProblem = await _chooseRecognizedProblem(problem);
      if (selectedProblem == null || !mounted) return;
      final confirmed = await showTextEntrySheet(
        context,
        title: 'Check what we read',
        body: 'Fix a sign or exponent if needed, then solve.',
        initialValue: selectedProblem,
        confirmLabel: 'Solve now',
        secondaryLabel: 'Retake',
        autofocus: false,
      );
      if (confirmed != null && mounted) {
        await _openSolution(confirmed, source);
      }
    } on ApiException catch (error) {
      if (mounted) {
        _showMessage(error.message);
      }
    } on Object {
      if (mounted) {
        _showMessage('We could not read that image. Please try again.');
      }
    } finally {
      if (mounted) {
        setState(() => _isReading = false);
      }
    }
  }

  Future<Uint8List?> _cropImage(Uint8List bytes) async {
    final directory = await getTemporaryDirectory();
    final source = File(
      '${directory.path}/mathsolver-capture-${DateTime.now().microsecondsSinceEpoch}.jpg',
    );
    await source.writeAsBytes(bytes, flush: true);
    try {
      final cropped = await ImageCropper().cropImage(
        sourcePath: source.path,
        compressFormat: ImageCompressFormat.jpg,
        compressQuality: 94,
        uiSettings: [
          AndroidUiSettings(
            toolbarTitle: 'Frame the math',
            toolbarColor: AppTheme.ink,
            toolbarWidgetColor: Colors.white,
            activeControlsWidgetColor: AppTheme.electric,
            lockAspectRatio: false,
          ),
          IOSUiSettings(
            title: 'Frame the math',
            doneButtonTitle: 'Use photo',
            cancelButtonTitle: 'Retake',
            rotateButtonsHidden: false,
            resetButtonHidden: false,
          ),
        ],
      );
      if (cropped == null) return null;
      return File(cropped.path).readAsBytes();
    } finally {
      if (await source.exists()) await source.delete();
    }
  }

  Future<String?> _chooseRecognizedProblem(String raw) async {
    final candidates = raw
        .split(RegExp(r'\n+'))
        .map((item) => item.trim())
        .where((item) => item.isNotEmpty)
        .toList(growable: false);
    if (candidates.length < 2 ||
        candidates.length > 10 ||
        candidates.any((item) => item.length > 500)) {
      return raw;
    }
    return showModalBottomSheet<String>(
      context: context,
      useSafeArea: true,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.62,
        maxChildSize: 0.9,
        builder: (context, scrollController) => ListView(
          controller: scrollController,
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: [
            Text(
              'Which problem?',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 6),
            Text(
              'We found ${candidates.length} possible lines on this worksheet.',
            ),
            const SizedBox(height: 14),
            for (var index = 0; index < candidates.length; index++)
              Card(
                child: ListTile(
                  leading: CircleAvatar(child: Text('${index + 1}')),
                  title: Text(candidates[index]),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => Navigator.pop(context, candidates[index]),
                ),
              ),
            TextButton(
              onPressed: () => Navigator.pop(context, raw),
              child: const Text('Use the full worksheet text'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openPasteSheet() async {
    final value = await showTextEntrySheet(
      context,
      title: 'Paste a problem',
      body: 'Plain math and LaTeX both work.',
      confirmLabel: 'Solve now',
      hintText: r'Example: 2x² - 7x + 3 = 0',
    );
    if (value != null && mounted) {
      await _openSolution(value, ProblemSource.typed);
    }
  }

  Future<void> _solveTyped() async {
    final value = _problemController.text.trim();
    if (value.isEmpty) {
      return;
    }
    FocusScope.of(context).unfocus();
    await _openSolution(value, ProblemSource.typed);
  }

  Future<void> _openLatestVideo() async {
    final latest = widget.controller.latestSolution;
    if (latest == null) {
      return;
    }
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => VideoStudioScreen(
          account: widget.account,
          api: widget.videoApi,
          problem: latest.problem,
          solution: latest.solution,
          requestKey: 'mobile-${latest.id}',
        ),
      ),
    );
  }

  Future<void> _openLatestSolution() async {
    final latest = widget.controller.latestSolution;
    if (latest == null) return;
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => SolutionScreen(
          problem: latest.problem,
          source: latest.source,
          controller: widget.controller,
          api: widget.api,
          account: widget.account,
          videoApi: widget.videoApi,
          initialSolution: latest.solution,
          existingRecordId: latest.id,
          saveToNotebook: false,
        ),
      ),
    );
  }

  Future<void> _openSolution(String problem, ProblemSource source) {
    return Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (context) => SolutionScreen(
          problem: problem,
          source: source,
          controller: widget.controller,
          api: widget.api,
          account: widget.account,
          videoApi: widget.videoApi,
        ),
      ),
    );
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }
}

enum _WorkImageSource { camera, gallery }

class _CheckWorkSourceSheet extends StatelessWidget {
  const _CheckWorkSourceSheet();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: AppTheme.mint,
              borderRadius: BorderRadius.circular(18),
            ),
            alignment: Alignment.center,
            child: const Icon(Icons.fact_check_outlined, color: AppTheme.ink),
          ),
          const SizedBox(height: 16),
          Text(
            'Check every handwritten line',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 7),
          Text(
            'We find the first mathematical mistake and give one useful hint.',
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: () => Navigator.pop(context, _WorkImageSource.camera),
              icon: const Icon(Icons.camera_alt_rounded),
              label: const Text('Scan my work'),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => Navigator.pop(context, _WorkImageSource.gallery),
              icon: const Icon(Icons.photo_library_outlined),
              label: const Text('Choose a photo'),
            ),
          ),
        ],
      ),
    );
  }
}

class _HomeHeader extends StatelessWidget {
  const _HomeHeader({required this.onOpenProfile});

  final VoidCallback onOpenProfile;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: AppTheme.electric,
            borderRadius: BorderRadius.circular(15),
          ),
          alignment: Alignment.center,
          child: const Icon(
            Icons.functions_rounded,
            color: Colors.white,
            size: 25,
          ),
        ),
        const SizedBox(width: 11),
        Text('MathSolver', style: Theme.of(context).textTheme.titleLarge),
        const Spacer(),
        IconButton(
          tooltip: 'Profile and settings',
          onPressed: onOpenProfile,
          style: IconButton.styleFrom(
            backgroundColor: Theme.of(context).colorScheme.surfaceContainerLow,
          ),
          icon: const Icon(Icons.person_outline_rounded),
        ),
      ],
    );
  }
}

class _ScanHero extends StatelessWidget {
  const _ScanHero({required this.isBusy, required this.onTap});

  final bool isBusy;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Scan a math problem',
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(32),
        clipBehavior: Clip.antiAlias,
        child: Ink(
          height: 210,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF243574), AppTheme.electric],
            ),
          ),
          child: InkWell(
            onTap: isBusy ? null : onTap,
            child: Stack(
              children: [
                // Viewfinder framing a faint problem: the scan story in one glance.
                Positioned(
                  right: 22,
                  top: 26,
                  child: SizedBox(
                    width: 158,
                    height: 96,
                    child: CustomPaint(
                      painter: _ViewfinderPainter(
                        color: Colors.white.withValues(alpha: 0.55),
                      ),
                      child: Center(
                        child: Text(
                          '2x² − 7x + 3 = 0',
                          style: Theme.of(context).textTheme.titleMedium
                              ?.copyWith(
                                color: Colors.white.withValues(alpha: 0.62),
                                fontSize: 15,
                                letterSpacing: 0.2,
                              ),
                        ),
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 58,
                        height: 58,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        alignment: Alignment.center,
                        child: isBusy
                            ? const Padding(
                                padding: EdgeInsets.all(16),
                                child: CircularProgressIndicator(
                                  strokeWidth: 3,
                                ),
                              )
                            : const Icon(
                                Icons.camera_alt_rounded,
                                color: AppTheme.ink,
                                size: 30,
                              ),
                      ),
                      const Spacer(),
                      Text(
                        isBusy ? 'Reading your problem…' : 'Scan a problem',
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(color: Colors.white, fontSize: 26),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              'One tap to the camera',
                              style: Theme.of(context).textTheme.bodyMedium
                                  ?.copyWith(
                                    color: Colors.white.withValues(alpha: 0.76),
                                  ),
                            ),
                          ),
                          const Icon(
                            Icons.arrow_forward_rounded,
                            color: Colors.white,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ViewfinderPainter extends CustomPainter {
  const _ViewfinderPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.6
      ..strokeCap = StrokeCap.round;
    const radius = 18.0;
    const arm = 16.0;
    final w = size.width;
    final h = size.height;

    Path corner(Offset origin, double dx, double dy) {
      // Rounded L-bracket: arm → quarter arc → arm, mirrored per corner.
      final path = Path()
        ..moveTo(origin.dx + dx * (radius + arm), origin.dy)
        ..lineTo(origin.dx + dx * radius, origin.dy)
        ..quadraticBezierTo(
          origin.dx,
          origin.dy,
          origin.dx,
          origin.dy + dy * radius,
        )
        ..lineTo(origin.dx, origin.dy + dy * (radius + arm));
      return path;
    }

    canvas.drawPath(corner(Offset.zero, 1, 1), paint);
    canvas.drawPath(corner(Offset(w, 0), -1, 1), paint);
    canvas.drawPath(corner(Offset(0, h), 1, -1), paint);
    canvas.drawPath(corner(Offset(w, h), -1, -1), paint);
  }

  @override
  bool shouldRepaint(_ViewfinderPainter oldDelegate) =>
      oldDelegate.color != color;
}

class _QuickInputCard extends StatelessWidget {
  const _QuickInputCard({
    required this.controller,
    required this.enabled,
    required this.onSolve,
  });

  final TextEditingController controller;
  final bool enabled;
  final VoidCallback onSolve;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 10, 10),
      decoration: BoxDecoration(
        color: colors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              enabled: enabled,
              minLines: 1,
              maxLines: 4,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => onSolve(),
              decoration: const InputDecoration(
                hintText: 'Type or paste a math problem',
                filled: false,
                contentPadding: EdgeInsets.symmetric(
                  horizontal: 4,
                  vertical: 13,
                ),
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
              ),
            ),
          ),
          const SizedBox(width: 8),
          IconButton.filled(
            tooltip: 'Solve typed problem',
            onPressed: enabled ? onSolve : null,
            icon: const Icon(Icons.arrow_upward_rounded),
          ),
        ],
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final enabled = onTap != null;
    return Material(
      color: colors.surfaceContainerLow,
      borderRadius: BorderRadius.circular(20),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 15),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 21,
                color: enabled ? colors.primary : colors.outline,
              ),
              const SizedBox(width: 9),
              Flexible(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    label,
                    maxLines: 1,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontSize: 14.5,
                      color: enabled ? colors.onSurface : colors.outline,
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

class _ReadingStatus extends StatelessWidget {
  const _ReadingStatus();

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colors.primaryContainer,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          const SizedBox.square(
            dimension: 22,
            child: CircularProgressIndicator(strokeWidth: 2.5),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Reading signs, fractions, and exponents…',
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ),
        ],
      ),
    );
  }
}

class _VideoPromise extends StatelessWidget {
  const _VideoPromise({required this.onTap});

  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final background = AppTheme.mintCard(colors);
    final foreground = AppTheme.onMintCard(colors);
    return Material(
      color: background,
      borderRadius: BorderRadius.circular(26),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                  color: colors.brightness == Brightness.dark
                      ? AppTheme.mint
                      : Colors.white,
                  borderRadius: BorderRadius.circular(18),
                ),
                alignment: Alignment.center,
                child: const Icon(
                  Icons.play_arrow_rounded,
                  color: AppTheme.ink,
                  size: 33,
                ),
              ),
              const SizedBox(width: 15),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Watch your exact problem',
                      style: Theme.of(
                        context,
                      ).textTheme.titleMedium?.copyWith(color: foreground),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      onTap == null
                          ? 'Solve once to create a private animated lesson.'
                          : 'Turn your latest solution into a narrated video.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: foreground.withValues(alpha: 0.72),
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                onTap == null
                    ? Icons.lock_outline_rounded
                    : Icons.arrow_forward_rounded,
                color: foreground,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RecentSolution extends StatelessWidget {
  const _RecentSolution({required this.record, required this.onTap});

  final SolutionRecord record;
  final VoidCallback onTap;

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
          padding: const EdgeInsets.all(17),
          child: Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: colors.primaryContainer,
                  borderRadius: BorderRadius.circular(15),
                ),
                alignment: Alignment.center,
                child: Icon(
                  Icons.check_rounded,
                  color: colors.onPrimaryContainer,
                ),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      plainMathPreview(record.problem),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${record.source.label} · ${_savedLabel(record.createdAt)}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded),
            ],
          ),
        ),
      ),
    );
  }
}

String _savedLabel(DateTime value) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final day = DateTime(value.year, value.month, value.day);
  if (day == today) return 'saved today';
  if (day == today.subtract(const Duration(days: 1))) {
    return 'saved yesterday';
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
  return 'saved ${months[value.month - 1]} ${value.day}';
}

class _NoRecent extends StatelessWidget {
  const _NoRecent();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(22),
      ),
      child: Text(
        'Your solved problems will appear here automatically.',
        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
      ),
    );
  }
}
