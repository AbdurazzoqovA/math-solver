import 'package:flutter/material.dart';
import 'package:flutter_math_fork/flutter_math.dart';

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
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
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
