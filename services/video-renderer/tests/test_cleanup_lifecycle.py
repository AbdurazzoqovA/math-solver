from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from lifecycle import (
    CLEANUP_EARLY_TOLERANCE_MS,
    generation_object_prefix,
    legacy_object_prefix,
)
from models import CleanupTask, LessonPlan, RenderTask
from pipeline import CleanupTooEarly, cleanup_expired_lesson
from pipeline import _delete_lease_uploads, _upload_lesson
from render_engine import RenderedClip


FIXTURE = Path(__file__).parent.parent / "lesson-example.json"


class _Snapshot:
    def __init__(self, value: dict[str, object] | None) -> None:
        self._value = value
        self.exists = value is not None

    def to_dict(self) -> dict[str, object] | None:
        return dict(self._value) if self._value is not None else None


class _Reference:
    def __init__(self, value: dict[str, object] | None) -> None:
        self.value = value

    def get(self, transaction=None) -> _Snapshot:
        del transaction
        return _Snapshot(self.value)


class _Transaction:
    def delete(self, reference: _Reference) -> None:
        reference.value = None


class _Database:
    def __init__(self, value: dict[str, object] | None) -> None:
        self.reference = _Reference(value)

    def document(self, path: str) -> _Reference:
        del path
        return self.reference

    def transaction(self) -> _Transaction:
        return _Transaction()


class _Blob:
    def __init__(self, name: str = "") -> None:
        self.name = name
        self.deleted = False

    def delete(self, timeout: int) -> None:
        self.deleted = timeout == 60


class _Bucket:
    def __init__(self, blobs: list[_Blob] | None = None) -> None:
        self.prefixes: list[str] = []
        self.blobs = blobs if blobs is not None else [_Blob()]
        self.blob = self.blobs[0]

    def list_blobs(self, *, prefix: str) -> list[_Blob]:
        self.prefixes.append(prefix)
        return self.blobs


class VideoCleanupLifecycleTests(unittest.TestCase):
    def test_colliding_legacy_cleanup_preserves_nested_generations(
        self,
    ) -> None:
        uid = "v2"
        job_id = "a" * 40
        expires_at = 10_000
        prefix = legacy_object_prefix(uid, job_id)
        legacy_manifest = _Blob(f"{prefix}manifest.json")
        legacy_clip = _Blob(f"{prefix}clips/01-full-lesson.mp4")
        nested_generation = _Blob(
            f"{prefix}{'b' * 40}/20000/leases/{'1' * 32}/manifest.json"
        )
        bucket = _Bucket(
            [legacy_manifest, legacy_clip, nested_generation]
        )
        database = _Database(
            {
                "uid": uid,
                "id": job_id,
                "expiresAt": expires_at,
                "objectPrefix": prefix,
            }
        )
        task = CleanupTask(
            schemaVersion=1,
            uid=uid,
            jobId=job_id,
        )

        with (
            patch("pipeline._firestore", return_value=database),
            patch("pipeline._storage", return_value=(None, bucket)),
            patch("pipeline.firestore.transactional", side_effect=lambda f: f),
            patch("pipeline.time.time", return_value=10),
        ):
            self.assertEqual(cleanup_expired_lesson(task), "deleted")

        self.assertTrue(legacy_manifest.deleted)
        self.assertTrue(legacy_clip.deleted)
        self.assertFalse(nested_generation.deleted)

    def test_failed_upload_removes_partial_lease_objects(self) -> None:
        uid = "student"
        job_id = "a" * 40
        expires_at = 10_000
        job_prefix = generation_object_prefix(uid, job_id, expires_at)
        lease_token = "1" * 32
        bucket = _Bucket()
        task = RenderTask(
            schemaVersion=1,
            uid=uid,
            jobId=job_id,
            attempt=1,
        )
        plan = LessonPlan.model_validate(
            json.loads(FIXTURE.read_text(encoding="utf-8"))
        )

        with tempfile.TemporaryDirectory() as work:
            placeholder = Path(work) / "full-lesson"
            clip = RenderedClip(
                id="full-lesson",
                step=1,
                title="Full explanation",
                duration_seconds=60,
                video_path=placeholder.with_suffix(".mp4"),
                captions_path=placeholder.with_suffix(".vtt"),
                poster_path=placeholder.with_suffix(".jpg"),
                transcript_similarity=1,
            )
            upload_count = 0

            def fail_after_first_upload(bucket, local_path, object_key):
                del bucket, local_path
                nonlocal upload_count
                upload_count += 1
                if upload_count > 1:
                    raise RuntimeError("simulated upload failure")
                return object_key

            with (
                patch("pipeline._storage", return_value=(None, bucket)),
                patch(
                    "pipeline._upload_file",
                    side_effect=fail_after_first_upload,
                ),
                self.assertRaisesRegex(
                    RuntimeError,
                    "simulated upload failure",
                ),
            ):
                _upload_lesson(
                    task,
                    {
                        "objectPrefix": job_prefix,
                        "expiresAt": expires_at,
                    },
                    lease_token,
                    plan,
                    [clip],
                    Path(work),
                )

        self.assertEqual(
            bucket.prefixes,
            [f"{job_prefix}leases/{lease_token}/"],
        )
        self.assertTrue(bucket.blob.deleted)

    def test_lost_renderer_deletes_only_its_lease_prefix(self) -> None:
        uid = "student"
        job_id = "a" * 40
        expires_at = 10_000
        prefix = generation_object_prefix(uid, job_id, expires_at)
        bucket = _Bucket()
        task = RenderTask(
            schemaVersion=1,
            uid=uid,
            jobId=job_id,
            attempt=1,
        )

        with patch("pipeline._storage", return_value=(None, bucket)):
            _delete_lease_uploads(
                task,
                {"objectPrefix": prefix, "expiresAt": expires_at},
                "1" * 32,
            )

        self.assertEqual(
            bucket.prefixes,
            [f"{prefix}leases/{'1' * 32}/"],
        )
        self.assertTrue(bucket.blob.deleted)

    def test_cleanup_deletes_only_the_matching_generation_transactionally(
        self,
    ) -> None:
        uid = "student"
        job_id = "a" * 40
        expires_at = 10_000
        prefix = generation_object_prefix(uid, job_id, expires_at)
        database = _Database(
            {
                "uid": uid,
                "id": job_id,
                "expiresAt": expires_at,
                "objectPrefix": prefix,
            }
        )
        bucket = _Bucket()
        task = CleanupTask(
            schemaVersion=1,
            uid=uid,
            jobId=job_id,
            expiresAt=expires_at,
            objectPrefix=prefix,
        )

        with (
            patch("pipeline._firestore", return_value=database),
            patch("pipeline._storage", return_value=(None, bucket)),
            patch("pipeline.firestore.transactional", side_effect=lambda f: f),
            patch("pipeline.time.time", return_value=10),
        ):
            self.assertEqual(cleanup_expired_lesson(task), "deleted")

        self.assertIsNone(database.reference.value)
        self.assertEqual(bucket.prefixes, [prefix])
        self.assertTrue(bucket.blob.deleted)

    def test_stale_cleanup_preserves_current_job_and_deletes_old_prefix(
        self,
    ) -> None:
        uid = "student"
        job_id = "a" * 40
        stale_expiry = 10_000
        current_expiry = 20_000
        stale_prefix = generation_object_prefix(uid, job_id, stale_expiry)
        current_prefix = generation_object_prefix(uid, job_id, current_expiry)
        current_job = {
            "uid": uid,
            "id": job_id,
            "expiresAt": current_expiry,
            "objectPrefix": current_prefix,
        }
        database = _Database(current_job)
        bucket = _Bucket()
        task = CleanupTask(
            schemaVersion=1,
            uid=uid,
            jobId=job_id,
            expiresAt=stale_expiry,
            objectPrefix=stale_prefix,
        )

        with (
            patch("pipeline._firestore", return_value=database),
            patch("pipeline._storage", return_value=(None, bucket)),
            patch("pipeline.firestore.transactional", side_effect=lambda f: f),
            patch("pipeline.time.time", return_value=10),
        ):
            self.assertEqual(cleanup_expired_lesson(task), "stale_deleted")

        self.assertEqual(database.reference.value, current_job)
        self.assertEqual(bucket.prefixes, [stale_prefix])

    def test_cleanup_refuses_to_run_before_its_generation_expires(self) -> None:
        uid = "student"
        job_id = "a" * 40
        expires_at = CLEANUP_EARLY_TOLERANCE_MS + 10_001
        prefix = generation_object_prefix(uid, job_id, expires_at)
        database = _Database(None)
        bucket = _Bucket()
        task = CleanupTask(
            schemaVersion=1,
            uid=uid,
            jobId=job_id,
            expiresAt=expires_at,
            objectPrefix=prefix,
        )

        with (
            patch("pipeline._firestore", return_value=database),
            patch("pipeline._storage", return_value=(None, bucket)),
            patch("pipeline.firestore.transactional", side_effect=lambda f: f),
            patch("pipeline.time.time", return_value=10),
        ):
            with self.assertRaises(CleanupTooEarly):
                cleanup_expired_lesson(task)

        self.assertEqual(bucket.prefixes, [])

    def test_legacy_cleanup_cannot_delete_a_new_generation(self) -> None:
        uid = "student"
        job_id = "a" * 40
        current_expiry = CLEANUP_EARLY_TOLERANCE_MS + 20_000
        current_prefix = generation_object_prefix(uid, job_id, current_expiry)
        current_job = {
            "uid": uid,
            "id": job_id,
            "expiresAt": current_expiry,
            "objectPrefix": current_prefix,
        }
        database = _Database(current_job)
        bucket = _Bucket()
        task = CleanupTask(schemaVersion=1, uid=uid, jobId=job_id)

        with (
            patch("pipeline._firestore", return_value=database),
            patch("pipeline._storage", return_value=(None, bucket)),
            patch("pipeline.firestore.transactional", side_effect=lambda f: f),
            patch("pipeline.time.time", return_value=10),
        ):
            self.assertEqual(cleanup_expired_lesson(task), "stale_deleted")

        self.assertEqual(database.reference.value, current_job)
        self.assertEqual(bucket.prefixes, [legacy_object_prefix(uid, job_id)])


if __name__ == "__main__":
    unittest.main()
