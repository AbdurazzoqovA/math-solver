import 'package:flutter/material.dart';

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
  });

  final String title;
  final String? body;
  final String? initialValue;
  final String? hintText;
  final String confirmLabel;
  final String? secondaryLabel;
  final int maxLines;
  final bool autofocus;

  @override
  State<TextEntrySheet> createState() => _TextEntrySheetState();
}

class _TextEntrySheetState extends State<TextEntrySheet> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialValue);
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
            TextField(
              controller: _controller,
              autofocus: widget.autofocus,
              minLines: 2,
              maxLines: widget.maxLines,
              decoration: InputDecoration(hintText: widget.hintText),
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
