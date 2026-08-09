import 'package:flutter_test/flutter_test.dart';
import 'package:mathsolver_mobile/core/storage/video_offline_cache.dart';

void main() {
  test('offline cache keys isolate identical clip ids between lessons', () {
    const clipId = 'full-lesson';

    expect(
      VideoOfflineCache.cacheKey('lesson-a', clipId),
      isNot(VideoOfflineCache.cacheKey('lesson-b', clipId)),
    );
  });

  test('offline cache keys cannot escape the private cache directory', () {
    expect(
      VideoOfflineCache.cacheKey('../lesson', '../clip'),
      isNot(contains('/')),
    );
  });
}
