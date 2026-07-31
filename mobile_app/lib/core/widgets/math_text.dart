import 'package:flutter/material.dart';
import 'package:flutter_math_fork/flutter_math.dart';

const _superscripts = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  'n': 'ⁿ',
  '-': '⁻',
};

/// One-line plain-text rendering of a problem for list tiles: strips LaTeX
/// delimiters and maps common tokens to readable unicode. Not a full
/// renderer — unknown commands simply lose their backslash.
String plainMathPreview(String value) {
  var text = value.replaceAll('\n', ' ').replaceAll(RegExp(r'\${1,2}'), '');
  text = text.replaceAllMapped(
    RegExp(r'\^\{?([0-9n\-]{1,3})\}?'),
    (match) => match
        .group(1)!
        .split('')
        .map((c) => _superscripts[c] ?? c)
        .join(),
  );
  text = text
      .replaceAllMapped(
        RegExp(r'\\frac\{([^{}]+)\}\{([^{}]+)\}'),
        (match) => '${match.group(1)}/${match.group(2)}',
      )
      .replaceAll(r'\sqrt', '√')
      .replaceAll(r'\pm', '±')
      .replaceAll(r'\cdot', '·')
      .replaceAll(r'\times', '×')
      .replaceAll(r'\div', '÷')
      .replaceAll(r'\pi', 'π')
      .replaceAll(r'\theta', 'θ')
      .replaceAll(r'\infty', '∞')
      .replaceAll(r'\left', '')
      .replaceAll(r'\right', '')
      .replaceAllMapped(RegExp(r'\\([a-zA-Z]+)'), (match) => match.group(1)!)
      .replaceAll('{', '')
      .replaceAll('}', '');
  return text.replaceAll(RegExp(r'\s+'), ' ').trim();
}

class MathText extends StatelessWidget {
  const MathText(
    this.data, {
    super.key,
    this.style,
    this.textAlign = TextAlign.start,
  });

  final String data;
  final TextStyle? style;
  final TextAlign textAlign;

  @override
  Widget build(BuildContext context) {
    final baseStyle = style ?? Theme.of(context).textTheme.bodyLarge!;
    final blocks = _splitBlocks(data);
    return Column(
      crossAxisAlignment: textAlign == TextAlign.center
          ? CrossAxisAlignment.center
          : CrossAxisAlignment.start,
      children: [
        for (final block in blocks)
          if (block.isMath)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: _ScrollableEquation(
                child: Math.tex(
                  block.value,
                  mathStyle: MathStyle.display,
                  textStyle: baseStyle.copyWith(
                    fontSize: (baseStyle.fontSize ?? 16) + 2,
                  ),
                  onErrorFallback: (_) =>
                      SelectableText(block.value, style: baseStyle),
                ),
              ),
            )
          else
            for (final line in block.value.split('\n'))
              if (line.trim().isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _InlineMathLine(
                    line: line,
                    style: baseStyle,
                    textAlign: textAlign,
                  ),
                ),
      ],
    );
  }

  static List<_MathBlock> _splitBlocks(String value) {
    final matches = RegExp(r'\$\$(.*?)\$\$', dotAll: true).allMatches(value);
    if (matches.isEmpty) {
      return [_MathBlock(value: value, isMath: false)];
    }

    final blocks = <_MathBlock>[];
    var cursor = 0;
    for (final match in matches) {
      if (match.start > cursor) {
        blocks.add(
          _MathBlock(
            value: value.substring(cursor, match.start),
            isMath: false,
          ),
        );
      }
      blocks.add(
        _MathBlock(value: (match.group(1) ?? '').trim(), isMath: true),
      );
      cursor = match.end;
    }
    if (cursor < value.length) {
      blocks.add(_MathBlock(value: value.substring(cursor), isMath: false));
    }
    return blocks;
  }
}

/// Horizontal scroller for wide display equations with a right-edge fade so
/// truncation is visibly "more to see" instead of looking clipped.
class _ScrollableEquation extends StatefulWidget {
  const _ScrollableEquation({required this.child});

  final Widget child;

  @override
  State<_ScrollableEquation> createState() => _ScrollableEquationState();
}

class _ScrollableEquationState extends State<_ScrollableEquation> {
  final _controller = ScrollController();
  var _showEndHint = false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_update);
    WidgetsBinding.instance.addPostFrameCallback((_) => _update());
  }

  @override
  void dispose() {
    _controller.removeListener(_update);
    _controller.dispose();
    super.dispose();
  }

  void _update() {
    if (!_controller.hasClients) return;
    final position = _controller.position;
    final showEndHint =
        position.maxScrollExtent > 0 &&
        position.pixels < position.maxScrollExtent - 4;
    if (showEndHint != _showEndHint) {
      setState(() => _showEndHint = showEndHint);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scroller = NotificationListener<SizeChangedLayoutNotification>(
      onNotification: (_) {
        WidgetsBinding.instance.addPostFrameCallback((_) => _update());
        return false;
      },
      child: SizeChangedLayoutNotifier(
        child: SingleChildScrollView(
          controller: _controller,
          scrollDirection: Axis.horizontal,
          child: widget.child,
        ),
      ),
    );
    if (!_showEndHint) {
      return scroller;
    }
    // Fade the content itself so the hint works on any card color.
    return ShaderMask(
      shaderCallback: (bounds) => const LinearGradient(
        colors: [Colors.white, Colors.white, Colors.transparent],
        stops: [0, 0.88, 1],
      ).createShader(bounds),
      blendMode: BlendMode.dstIn,
      child: scroller,
    );
  }
}

class _InlineMathLine extends StatelessWidget {
  const _InlineMathLine({
    required this.line,
    required this.style,
    required this.textAlign,
  });

  final String line;
  final TextStyle style;
  final TextAlign textAlign;

  @override
  Widget build(BuildContext context) {
    final normalized = line.trimLeft().startsWith('- ')
        ? '• ${line.trimLeft().substring(2)}'
        : line;
    final matches = RegExp(
      r'(\$[^$\n]+\$|\*\*[^*\n]+\*\*)',
    ).allMatches(normalized);
    final children = <InlineSpan>[];
    var cursor = 0;
    for (final match in matches) {
      if (match.start > cursor) {
        children.add(TextSpan(text: normalized.substring(cursor, match.start)));
      }
      final token = match.group(0) ?? '';
      if (token.startsWith(r'$')) {
        final expression = token.substring(1, token.length - 1);
        children.add(
          WidgetSpan(
            alignment: PlaceholderAlignment.middle,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2),
              child: Math.tex(
                expression,
                mathStyle: MathStyle.text,
                textStyle: style,
                onErrorFallback: (_) => Text(expression, style: style),
              ),
            ),
          ),
        );
      } else {
        children.add(
          TextSpan(
            text: token.substring(2, token.length - 2),
            style: style.copyWith(fontWeight: FontWeight.w700),
          ),
        );
      }
      cursor = match.end;
    }
    if (cursor < normalized.length) {
      children.add(TextSpan(text: normalized.substring(cursor)));
    }

    return Semantics(
      label: normalized
          .replaceAll(r'$', '')
          .replaceAll('**', '')
          .replaceAll(RegExp(r'\\[a-zA-Z]+'), ''),
      child: RichText(
        textAlign: textAlign,
        text: TextSpan(style: style, children: children),
      ),
    );
  }
}

class _MathBlock {
  const _MathBlock({required this.value, required this.isMath});

  final String value;
  final bool isMath;
}
