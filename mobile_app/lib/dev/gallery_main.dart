// Dev-only screenshot gallery. Not part of the shipping app.
//
// Launch on a simulator with a state name, e.g.:
//   SIMCTL_CHILD_GALLERY_STATE=solution xcrun simctl launch booted io.mathsolver.app
// after building with:
//   flutter build ios --simulator --debug -t lib/dev/gallery_main.dart
//
// Each state seeds deterministic data and, where needed, drives the live UI
// with synthetic taps so any screen can be captured externally via
// `xcrun simctl io booted screenshot`.
import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/gestures.dart' show HitTestResult;
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';

import '../app.dart';
import '../core/network/mathsolver_api.dart';
import '../core/storage/notebook_repository.dart';
import '../core/widgets/text_entry_sheet.dart';
import '../features/practice/domain/practice_set.dart';
import '../features/practice/domain/review_item.dart';
import '../features/practice/presentation/quiz_screen.dart';
import '../features/solve/domain/math_review.dart';
import '../features/solve/domain/solution_record.dart';
import '../features/solve/presentation/solution_screen.dart';
import '../features/solve/presentation/solve_screen.dart';
import '../features/video/presentation/video_studio_screen.dart';

const _problem = r'Solve $2x^2 - 7x + 3 = 0$';

const _solution = r'''
**Step 1: Identify the coefficients**
The equation $2x^2 - 7x + 3 = 0$ is a quadratic in standard form $ax^2 + bx + c = 0$.
- $a = 2$, $b = -7$, $c = 3$

**Step 2: Compute the discriminant**
$$\Delta = b^2 - 4ac = (-7)^2 - 4(2)(3) = 49 - 24 = 25$$
Since $\Delta > 0$ there are two real solutions.

**Step 3: Apply the quadratic formula**
$$x = \frac{-b \pm \sqrt{\Delta}}{2a} = \frac{7 \pm 5}{4}$$

**Step 4: Simplify both roots**
- $x_1 = \frac{7 + 5}{4} = 3$
- $x_2 = \frac{7 - 5}{4} = \frac{1}{2}$

**Final Answer**
$$x = 3 \quad \text{or} \quad x = \frac{1}{2}$$
''';

final _seedSolutions = [
  SolutionRecord(
    id: 'seed-1',
    problem: r'Solve $2x^2 - 7x + 3 = 0$',
    solution: _solution,
    createdAt: DateTime.now().subtract(const Duration(hours: 1)),
    source: ProblemSource.camera,
  ),
  SolutionRecord(
    id: 'seed-2',
    problem: r'Differentiate $f(x) = x^3 \ln x$',
    solution:
        '**Step 1: Use the product rule**\n'
        r"$f'(x) = 3x^2 \ln x + x^3 \cdot \frac{1}{x}$"
        '\n\n**Final Answer**\n'
        r"$$f'(x) = x^2(3\ln x + 1)$$",
    createdAt: DateTime.now().subtract(const Duration(days: 1, hours: 3)),
    source: ProblemSource.typed,
  ),
  SolutionRecord(
    id: 'seed-3',
    problem: 'A train travels 240 km in 3 hours. How long for 400 km at the '
        'same speed?',
    solution:
        '**Step 1: Find the speed**\n'
        r'$v = \frac{240}{3} = 80$ km/h'
        '\n\n**Final Answer**\n'
        r'$$t = \frac{400}{80} = 5 \text{ hours}$$',
    createdAt: DateTime.now().subtract(const Duration(days: 2, hours: 5)),
    source: ProblemSource.gallery,
  ),
  SolutionRecord(
    id: 'seed-4',
    problem: r'Simplify $\frac{3}{4} + \frac{5}{6}$',
    solution:
        '**Step 1: Find a common denominator**\n'
        r'$\frac{9}{12} + \frac{10}{12}$'
        '\n\n**Final Answer**\n'
        r'$$\frac{19}{12}$$',
    createdAt: DateTime.now().subtract(const Duration(days: 4)),
    source: ProblemSource.typed,
  ),
];

const _quizQuestions = [
  PracticeQuestion(
    question: r'What is the discriminant of $x^2 - 6x + 5 = 0$?',
    options: ['16', '26', '36', '56'],
    correctAnswerIndex: 0,
  ),
  PracticeQuestion(
    question: r'Solve $x^2 - 5x + 6 = 0$.',
    options: [
      r'$x = 2$ or $x = 3$',
      r'$x = -2$ or $x = -3$',
      r'$x = 1$ or $x = 6$',
      r'$x = -1$ or $x = -6$',
    ],
    correctAnswerIndex: 0,
  ),
  PracticeQuestion(
    question: r'How many real roots does $x^2 + 4 = 0$ have?',
    options: ['0', '1', '2', '4'],
    correctAnswerIndex: 0,
  ),
  PracticeQuestion(
    question: r'For $ax^2 + bx + c = 0$, the roots are given by…',
    options: [
      r'$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$',
      r'$x = \frac{b \pm \sqrt{b^2 - 4ac}}{2a}$',
      r'$x = \frac{-b \pm \sqrt{b^2 + 4ac}}{2a}$',
      r'$x = \frac{-c \pm \sqrt{b^2 - 4ac}}{2b}$',
    ],
    correctAnswerIndex: 0,
  ),
];

final _dueReviews = [
  ReviewItem(
    id: 'review-1',
    question: _quizQuestions[0].copyWith(id: 'review-1'),
    sourceProblem: _problem,
    dueAt: DateTime.now().subtract(const Duration(days: 1)),
    intervalDays: 1,
    correctReviews: 0,
    lapses: 1,
    lastReviewedAt: DateTime.now().subtract(const Duration(days: 2)),
  ),
  ReviewItem(
    id: 'review-2',
    question: _quizQuestions[2].copyWith(id: 'review-2'),
    sourceProblem: _problem,
    dueAt: DateTime.now().subtract(const Duration(hours: 4)),
    intervalDays: 3,
    correctReviews: 1,
    lapses: 1,
    lastReviewedAt: DateTime.now().subtract(const Duration(days: 3)),
  ),
];

Future<String> _readState() async {
  final fromEnv = Platform.environment['GALLERY_STATE'];
  if (fromEnv != null && fromEnv.isNotEmpty) return fromEnv;
  try {
    final dir = await getApplicationDocumentsDirectory();
    final file = File('${dir.path}/gallery_state.txt');
    final value = file.existsSync() ? file.readAsStringSync().trim() : '';
    File(
      '${dir.path}/gallery_seen.txt',
    ).writeAsStringSync(value.isEmpty ? '<missing>' : value);
    if (value.isNotEmpty) return value;
  } on Object {
    // Fall through to the default state.
  }
  return 'home';
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final state = await _readState();
  final repository = _GalleryRepository(state);
  final api = _GalleryApi(state);
  runApp(MathSolverApp(repository: repository, api: api));
  unawaited(_drive(state));
}

// ---------------------------------------------------------------------------
// Scripted navigation per state
// ---------------------------------------------------------------------------

Future<void> _drive(String state) async {
  await _settle(const Duration(milliseconds: 1400));
  switch (state) {
    case 'onboarding':
    case 'home':
    case 'home-empty':
    case 'dark-home':
      break;
    case 'home-recent':
      await _swipeUp();
    case 'solution':
    case 'solution-full':
    case 'solution-error':
    case 'dark-solution':
      await _pushSolution();
    case 'practice':
    case 'practice-empty':
      await _selectTab(2);
    case 'quiz':
      await _pushQuiz();
    case 'quiz-checked':
      await _pushQuiz();
      await _settle(const Duration(milliseconds: 600));
      await _tapText('26');
      await _tapText('Check answer');
    case 'library':
      await _selectTab(1);
    case 'library-videos':
      await _selectTab(1);
      await _tapText('Videos');
    case 'profile':
      await _tapTooltip('Profile and settings');
    case 'check-sheet':
      await _tapText('Check my work');
    case 'paste-sheet':
      await _tapText('Paste a longer problem');
    case 'ocr-confirm':
      await _showOcrConfirm();
    case 'camera':
      await _tapText('Scan a problem');
    case 'video-studio':
      await _pushVideoStudio();
  }
}

Future<void> _settle(Duration duration) => Future<void>.delayed(duration);

Future<void> _swipeUp() async {
  final binding = WidgetsBinding.instance;
  final size = binding.platformDispatcher.views.first.physicalSize /
      binding.platformDispatcher.views.first.devicePixelRatio;
  var position = Offset(size.width / 2, size.height * 0.72);
  binding.handlePointerEvent(PointerDownEvent(position: position));
  for (var i = 0; i < 30; i++) {
    await _settle(const Duration(milliseconds: 8));
    final next = position - const Offset(0, 14);
    binding.handlePointerEvent(
      PointerMoveEvent(position: next, delta: next - position),
    );
    position = next;
  }
  binding.handlePointerEvent(PointerUpEvent(position: position));
  await _settle(const Duration(milliseconds: 900));
}

List<Element> _findAll(bool Function(Element) test) {
  final results = <Element>[];
  void visit(Element element) {
    if (test(element)) results.add(element);
    element.visitChildren(visit);
  }

  final root = WidgetsBinding.instance.rootElement;
  if (root != null) visit(root);
  return results;
}

Element? _find(bool Function(Element) test) {
  final all = _findAll(test);
  return all.isEmpty ? null : all.first;
}

/// Whether the element's render object actually receives pointers at its
/// center — filters out offstage IndexedStack pages and covered widgets.
bool _isHittable(Element element, Offset center) {
  final box = element.renderObject;
  if (box is! RenderBox || !box.attached) return false;
  final result = HitTestResult();
  WidgetsBinding.instance.hitTestInView(
    result,
    center,
    View.of(element).viewId,
  );
  return result.path.any((entry) => entry.target == box);
}

Future<void> _tapElement(Element? element) async {
  final box = element?.renderObject;
  if (box is! RenderBox || !box.attached) return;
  final center = box.localToGlobal(box.size.center(Offset.zero));
  final binding = WidgetsBinding.instance;
  binding.handlePointerEvent(PointerDownEvent(position: center));
  await _settle(const Duration(milliseconds: 90));
  binding.handlePointerEvent(PointerUpEvent(position: center));
  await _settle(const Duration(milliseconds: 900));
}

bool _matchesText(Element element, String text) {
  final widget = element.widget;
  if (widget is Text && (widget.data?.contains(text) ?? false)) return true;
  if (widget is RichText && widget.text.toPlainText().contains(text)) {
    return true;
  }
  return false;
}

Future<void> _tapText(String text) async {
  for (final element in _findAll((e) => _matchesText(e, text))) {
    final box = element.renderObject;
    if (box is! RenderBox || !box.attached) continue;
    final center = box.localToGlobal(box.size.center(Offset.zero));
    if (_isHittable(element, center)) {
      await _tapElement(element);
      return;
    }
  }
}

Future<void> _tapTooltip(String message) => _tapElement(
  _find((element) {
    final widget = element.widget;
    return widget is Tooltip && widget.message == message;
  }),
);

Future<void> _selectTab(int index) async {
  final bar =
      _find((element) => element.widget is NavigationBar)?.widget
          as NavigationBar?;
  bar?.onDestinationSelected?.call(index);
  await _settle(const Duration(milliseconds: 900));
}

SolveScreen? _solveScreen() =>
    _find((element) => element.widget is SolveScreen)?.widget as SolveScreen?;

NavigatorState? _navigator() {
  final element =
      _find(
            (element) =>
                element is StatefulElement && element.state is NavigatorState,
          )
          as StatefulElement?;
  return element?.state as NavigatorState?;
}

Future<void> _pushSolution() async {
  final solve = _solveScreen();
  final navigator = _navigator();
  if (solve == null || navigator == null) return;
  await navigator.push<void>(
    MaterialPageRoute(
      builder: (context) => SolutionScreen(
        problem: _problem,
        source: ProblemSource.camera,
        controller: solve.controller,
        api: solve.api,
        account: solve.account,
        videoApi: solve.videoApi,
        saveToNotebook: false,
      ),
    ),
  );
}

Future<void> _pushQuiz() async {
  final navigator = _navigator();
  if (navigator == null) return;
  unawaited(
    navigator.push<void>(
      MaterialPageRoute(
        builder: (context) => QuizScreen(
          practice: const PracticeSet(
            title: 'Quadratic check-in',
            questions: _quizQuestions,
          ),
        ),
      ),
    ),
  );
}

Future<void> _pushVideoStudio() async {
  final solve = _solveScreen();
  final navigator = _navigator();
  if (solve == null || navigator == null) return;
  unawaited(
    navigator.push<void>(
      MaterialPageRoute(
        builder: (context) => VideoStudioScreen(
          account: solve.account,
          api: solve.videoApi,
          problem: _problem,
          solution: _solution,
          requestKey: 'gallery',
        ),
      ),
    ),
  );
}

Future<void> _showOcrConfirm() async {
  final context = _navigator()?.context;
  if (context == null) return;
  unawaited(
    showTextEntrySheet(
      context,
      title: 'Check what we read',
      body: 'Fix a sign or exponent if needed, then solve.',
      initialValue: r'2x^2 - 7x + 3 = 0',
      confirmLabel: 'Solve now',
      secondaryLabel: 'Retake',
      autofocus: false,
    ),
  );
}

// ---------------------------------------------------------------------------
// Seeded storage
// ---------------------------------------------------------------------------

class _GalleryRepository implements NotebookRepository {
  _GalleryRepository(this.state);

  final String state;

  bool _onboardingComplete = false;

  @override
  Future<bool> readOnboardingComplete() async => switch (state) {
    'onboarding' => _onboardingComplete,
    _ => true,
  };

  @override
  Future<bool> readLearningMode() async => state != 'solution-full';

  @override
  Future<bool> readAnalyticsEnabled() async => false;

  @override
  Future<List<SolutionRecord>> readSolutions() async => switch (state) {
    'home-empty' || 'practice-empty' => const [],
    _ => _seedSolutions,
  };

  @override
  Future<List<ReviewItem>> readReviewItems() async => switch (state) {
    'practice' || 'quiz' || 'quiz-checked' || 'quiz-done' => _dueReviews,
    _ => const [],
  };

  @override
  Future<ThemeMode> readThemeMode() async =>
      state.startsWith('dark-') ? ThemeMode.dark : ThemeMode.light;

  @override
  Future<void> writeOnboardingComplete(bool value) async {
    _onboardingComplete = value;
  }

  @override
  Future<void> writeLearningMode(bool value) async {}

  @override
  Future<void> writeAnalyticsEnabled(bool value) async {}

  @override
  Future<void> writeSolutions(List<SolutionRecord> value) async {}

  @override
  Future<void> writeReviewItems(List<ReviewItem> items) async {}

  @override
  Future<void> writeThemeMode(ThemeMode value) async {}
}

// ---------------------------------------------------------------------------
// Canned network responses
// ---------------------------------------------------------------------------

class _GalleryApi extends MathSolverApi {
  _GalleryApi(this.state);

  final String state;

  @override
  Stream<String> streamSolution({
    required List<Map<String, String>> messages,
    String? source,
  }) async* {
    if (state == 'solution-error') {
      await Future<void>.delayed(const Duration(milliseconds: 700));
      throw const ApiException(
        'The connection was interrupted. Please try again.',
      );
    }
    const chunkSize = 60;
    for (var i = 0; i < _solution.length; i += chunkSize) {
      await Future<void>.delayed(const Duration(milliseconds: 24));
      yield _solution.substring(
        i,
        i + chunkSize > _solution.length ? _solution.length : i + chunkSize,
      );
    }
  }

  @override
  Future<SolutionVerification> verifySolution({
    required String problem,
    required String solution,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 900));
    return const SolutionVerification(
      status: SolutionVerificationStatus.checked,
      confidence: 0.97,
      summary:
          'Substituting both roots back into the original equation gives '
          'zero, so the answer checks out.',
      issues: [],
    );
  }

  @override
  Future<PracticeSet> generatePractice(String topic) async {
    await Future<void>.delayed(const Duration(milliseconds: 700));
    return const PracticeSet(
      title: 'Quadratic check-in',
      questions: _quizQuestions,
    );
  }

  @override
  Future<String> extractProblem({
    required Uint8List bytes,
    required String mimeType,
    String source = 'camera',
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 900));
    return r'2x^2 - 7x + 3 = 0';
  }

  @override
  Future<WorkCheckResult> checkWork({
    required Uint8List bytes,
    required String mimeType,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 900));
    return const WorkCheckResult(
      status: WorkCheckStatus.hasMistake,
      problem: r'2x^2 - 7x + 3 = 0',
      summary: 'The setup is right; a sign slips in step 2.',
      confidence: 0.9,
      lines: [
        WorkCheckLine(
          index: 0,
          transcription: r'x = (7 ± √25) / 4',
          status: WorkLineStatus.correct,
          explanation: 'Formula applied correctly.',
        ),
        WorkCheckLine(
          index: 1,
          transcription: r'x = (7 - 5) / 4 = 3',
          status: WorkLineStatus.incorrect,
          explanation: r'$\frac{7-5}{4}$ simplifies to $\frac{1}{2}$, not 3.',
          correction: r'x = \frac{1}{2}',
        ),
      ],
      firstMistakeIndex: 1,
      nextHint: 'Recheck the subtraction before dividing.',
    );
  }

  @override
  Future<void> reportSolutionIssue({
    required String category,
    String? reviewStatus,
  }) async {}
}
