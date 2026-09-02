from __future__ import annotations

import unittest

from lifecycle import (
    CLEANUP_EARLY_TOLERANCE_MS,
    RENDER_LEASE_MS,
    claim_decision,
    cleanup_decision,
    generation_object_prefix,
    is_legacy_job_object_name,
    is_valid_object_prefix,
    lease_object_prefix,
    legacy_object_prefix,
)


class VideoRendererLifecycleTests(unittest.TestCase):
    def test_recent_active_work_remains_exclusive_on_first_delivery(self) -> None:
        self.assertEqual(
            claim_decision(
                "rendering",
                1_000,
                1_000 + RENDER_LEASE_MS - 1,
            ),
            "busy",
        )

    def test_repeated_delivery_cannot_steal_a_recent_active_lease(self) -> None:
        self.assertEqual(
            claim_decision(
                "rendering",
                1_000,
                2_000,
            ),
            "busy",
        )

    def test_stale_cleanup_window_cannot_delete_a_restarted_job(self) -> None:
        now = 10_000
        self.assertEqual(
            cleanup_decision(
                now + CLEANUP_EARLY_TOLERANCE_MS + 1,
                now - 1,
                now,
            ),
            "stale",
        )

    def test_current_cleanup_window_still_enforces_expiry(self) -> None:
        now = 10_000
        current_expiry = now + CLEANUP_EARLY_TOLERANCE_MS + 1
        self.assertEqual(
            cleanup_decision(current_expiry, current_expiry, now),
            "early",
        )
        self.assertEqual(cleanup_decision(now, now, now), "delete")

    def test_legacy_cleanup_uses_the_current_legacy_expiry(self) -> None:
        now = 10_000
        self.assertEqual(cleanup_decision(now, None, now), "delete")
        self.assertEqual(
            cleanup_decision(
                now + CLEANUP_EARLY_TOLERANCE_MS + 1,
                None,
                now,
            ),
            "early",
        )

    def test_generation_prefix_is_disjoint_and_strictly_validated(self) -> None:
        uid = "student"
        job_id = "a" * 40
        first = generation_object_prefix(uid, job_id, 10_000)
        second = generation_object_prefix(uid, job_id, 20_000)
        legacy = legacy_object_prefix(uid, job_id)

        self.assertNotEqual(first, second)
        self.assertFalse(first.startswith(legacy))
        self.assertTrue(
            is_valid_object_prefix(first, uid, job_id, 10_000)
        )
        self.assertTrue(
            is_valid_object_prefix(legacy, uid, job_id, 10_000)
        )
        self.assertFalse(
            is_valid_object_prefix(second, uid, job_id, 10_000)
        )

    def test_each_render_lease_uploads_to_a_disjoint_prefix(self) -> None:
        job_prefix = generation_object_prefix("student", "a" * 40, 10_000)
        first = lease_object_prefix(job_prefix, "1" * 32)
        second = lease_object_prefix(job_prefix, "2" * 32)

        self.assertNotEqual(first, second)
        self.assertTrue(first.startswith(job_prefix))
        with self.assertRaises(ValueError):
            lease_object_prefix(job_prefix, "../unsafe")

    def test_legacy_object_filter_excludes_nested_generations(self) -> None:
        self.assertTrue(is_legacy_job_object_name("manifest.json"))
        self.assertTrue(
            is_legacy_job_object_name("clips/01-full-lesson.mp4")
        )
        self.assertTrue(
            is_legacy_job_object_name(
                f"leases/{'1' * 32}/posters/01-full-lesson.jpg"
            )
        )
        self.assertFalse(
            is_legacy_job_object_name(
                f"{'b' * 40}/123/leases/{'1' * 32}/manifest.json"
            )
        )

if __name__ == "__main__":
    unittest.main()
