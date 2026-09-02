import 'dart:io';
import 'dart:typed_data';

/// Reads a plugin-created image and then removes its temporary backing file.
///
/// Deletion is best-effort so a platform cleanup failure never discards bytes
/// that were already read successfully.
Future<Uint8List> readAndDeleteTemporaryImage(String path) async {
  final file = File(path);
  try {
    return await file.readAsBytes();
  } finally {
    await deleteTemporaryImage(path);
  }
}

Future<void> deleteTemporaryImage(String path) async {
  try {
    final file = File(path);
    if (await file.exists()) {
      await file.delete();
    }
  } on FileSystemException {
    // The OS may already have purged a cache file or may still hold it open.
  }
}
