import 'package:flutter/material.dart';

import 'math_text.dart';

Future<String?> showTextEntrySheet(
  BuildContext context, {
  required String title,
  required String confirmLabel,
  String? body,
  String? initialValue,
  String? hintText,
  String? secondaryLabel,
  int maxLines = 5,
  bool autofocus = true,
  bool showMathPreview = false,
}) {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (context) => TextEntrySheet(
      title: title,
      body: body,
      initialValue: initialValue,
      hintText: hintText,
      confirmLabel: confirmLabel,
      secondaryLabel: secondaryLabel,
      maxLines: maxLines,
      autofocus: autofocus,
      showMathPreview: showMathPreview,
    ),
  );
}

class TextEntrySheet extends StatefulWidget {
  const TextEntrySheet({
    super.key,
    required this.title,
    required this.confirmLabel,
    this.body,
    this.initialValue,
    this.hintText,
    this.secondaryLabel,
    this.maxLines = 5,
    this.autofocus = true,
    this.showMathPreview = false,
  });

  final String title;
  final String? body;
  final String? initialValue;
  final String? hintText;
  final String confirmLabel;
  final String? secondaryLabel;
  final int maxLines;
  final bool autofocus;
  final bool showMathPreview;

  @override
  State<TextEntrySheet> createState() => _TextEntrySheetState();
}

class _TextEntrySheetState extends State<TextEntrySheet> {
  late final TextEditingController _controller;
  late bool _isEditing;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialValue);
    _isEditing = !widget.showMathPreview;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return AnimatedPadding(
      duration: const Duration(milliseconds: 180),
      padding: EdgeInsets.fromLTRB(
        20,
        4,
        20,
        24 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.title,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            if (widget.body != null) ...[
              const SizedBox(height: 8),
              Text(
                widget.body!,
                style: Theme.of(
                  context,
                ).textTheme.bodyLarge?.copyWith(color: colors.onSurfaceVariant),
              ),
            ],
            const SizedBox(height: 18),
            if (widget.showMathPreview) ...[
              Container(
                key: const Key('recognized-math-preview'),
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: colors.surfaceContainerLow,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: colors.outlineVariant),
                ),
                child: MathText.auto(
                  _controller.text,
                  style: Theme.of(context).textTheme.titleLarge,
                  textAlign: TextAlign.center,
                ),
              ),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  key: const Key('edit-recognized-math'),
                  onPressed: () => setState(() => _isEditing = !_isEditing),
                  icon: Icon(
                    _isEditing ? Icons.check_rounded : Icons.edit_outlined,
                  ),
                  label: Text(
                    _isEditing ? 'Done editing' : 'Edit recognized text',
                  ),
                ),
              ),
            ],
            if (_isEditing)
              TextField(
                key: const Key('text-entry-field'),
                controller: _controller,
                autofocus: widget.autofocus,
                minLines: 2,
                maxLines: widget.maxLines,
                onChanged: widget.showMathPreview
                    ? (_) => setState(() {})
                    : null,
                decoration: InputDecoration(
                  hintText: widget.hintText,
                  labelText: widget.showMathPreview ? 'Recognized math' : null,
                ),
              ),
            const SizedBox(height: 16),
            Row(
              children: [
                if (widget.secondaryLabel != null) ...[
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      child: Text(widget.secondaryLabel!),
                    ),
                  ),
                  const SizedBox(width: 10),
                ],
                Expanded(
                  flex: widget.secondaryLabel == null ? 1 : 2,
                  child: FilledButton(
                    onPressed: _submit,
                    child: Text(widget.confirmLabel),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _submit() {
    final value = _controller.text.trim();
    if (value.isNotEmpty) {
      Navigator.pop(context, value);
    }
  }
}
