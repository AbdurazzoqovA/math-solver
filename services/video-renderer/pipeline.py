from __future__ import annotations

import concurrent.futures
import json
import logging
import os
import secrets
import tempfile
import time
from pathlib import Path
from typing import Any

import firebase_admin
from firebase_admin import credentials, firestore, messaging
from google.cloud import storage
from google.cloud.firestore_v1 import Client as FirestoreClient
from google.cloud.storage import Client as StorageClient
from gemini import GeminiValidationError
from models import CleanupTask, LessonInteraction, LessonPlan, RenderTask
from planner import create_lesson_plan, review_lesson_plan
from render_engine import RenderedClip, render_lesson_clips
from tts import VoiceResult, synthesize_verified_phrase

LOGGER = logging.getLogger("video-renderer")
DISCLOSURE = "AI-generated voice · Captions available"
RENDER_LEASE_MS = 10 * 60 * 1_000
ACTIVE_STATUSES = {
    "planning",
    "voicing",
    "rendering",
    "verifying",
    "uploading",
}
TERMINAL_STATUSES = {"ready", "unsupported", "failed"}
MAX_EXTERNAL_UNSUPPORTED_ATTEMPTS = 2
DEFAULT_DAILY_VIDEO_LIMIT = 10


class UnsupportedLesson(RuntimeError):
    pass


class LessonPlanningFailed(RuntimeError):
    pass


class RenderLeaseBusy(RuntimeError):
    pass


class RenderLeaseLost(RuntimeError):
    pass


class CleanupTooEarly(RuntimeError):
    pass


def _claim_decision(status: Any, updated_at: Any, now_ms: int) -> str:
    if status == "queued":
        return "claim"
    if status in TERMINAL_STATUSES:
        return "ignore"
    if status in ACTIVE_STATUSES:
        if not isinstance(updated_at, (int, float)):
            return "claim"
        return (
            "claim"
            if now_ms - int(updated_at) >= RENDER_LEASE_MS
            else "busy"
        )
    return "ignore"


def _firebase_app() -> firebase_admin.App:
    try:
        return firebase_admin.get_app("mathsolver-video-renderer")
    except ValueError:
        project_id = os.environ.get("FIREBASE_ADMIN_PROJECT_ID", "").strip()
        if not project_id:
            raise RuntimeError("FIREBASE_ADMIN_PROJECT_ID is not configured")
        return firebase_admin.initialize_app(
            credentials.ApplicationDefault(),
            {"projectId": project_id},
            name="mathsolver-video-renderer",
        )


def _firestore() -> FirestoreClient:
    return firestore.client(app=_firebase_app())


def _storage() -> tuple[StorageClient, storage.Bucket]:
    bucket_name = os.environ.get("VIDEO_STORAGE_BUCKET", "").strip()
    if not bucket_name:
        raise RuntimeError("VIDEO_STORAGE_BUCKET is not configured")
    project = os.environ.get("VIDEO_STORAGE_PROJECT") or os.environ.get(
        "GOOGLE_CLOUD_PROJECT"
    )
    client = storage.Client(project=project)
    return client, client.bucket(bucket_name)


def _notify_lesson_ready(task: RenderTask) -> None:
    database = _firestore()
    device_documents = list(
        database.collection(f"users/{task.uid}/devices").limit(100).stream()
    )
    tokens = []
    document_ids = []
    for document in device_documents:
        value = document.to_dict() or {}
        token = value.get("token")
        if isinstance(token, str) and 20 <= len(token) <= 4096:
            tokens.append(token)
            document_ids.append(document.id)
    if not tokens:
        return

    message = messaging.MulticastMessage(
        tokens=tokens,
        notification=messaging.Notification(
            title="Your MathSolver video is ready",
            body="Open your private lesson when you are ready to learn.",
        ),
        data={"kind": "video_ready", "jobId": task.jobId},
        android=messaging.AndroidConfig(priority="high"),
        apns=messaging.APNSConfig(
            payload=messaging.APNSPayload(
                aps=messaging.Aps(sound="default", badge=1)
            )
        ),
    )
    response = messaging.send_each_for_multicast(
        message,
        app=_firebase_app(),
    )
    stale_codes = {
        "registration-token-not-registered",
        "invalid-argument",
    }
    stale_ids = []
    for index, send_response in enumerate(response.responses):
        error = send_response.exception
        if error is not None and getattr(error, "code", "") in stale_codes:
            stale_ids.append(document_ids[index])
    if stale_ids:
        batch = database.batch()
        for device_id in stale_ids:
            batch.delete(
                database.document(f"users/{task.uid}/devices/{device_id}")
            )
            batch.delete(database.document(f"mobileDevices/{device_id}"))
        batch.commit()
    LOGGER.info(
        "Video-ready notifications complete sent=%d failed=%d stale=%d",
        response.success_count,
        response.failure_count,
        len(stale_ids),
    )


def cleanup_expired_lesson(task: CleanupTask) -> str:
    reference = _firestore().document(
        f"users/{task.uid}/videoJobs/{task.jobId}"
    )
    snapshot = reference.get()
    if not snapshot.exists:
        return "ignored"
    job = snapshot.to_dict() or {}
    if job.get("uid") != task.uid or job.get("id") != task.jobId:
        return "ignored"

    expires_at = int(job.get("expiresAt", 0))
    if expires_at > int(time.time() * 1000) + 60_000:
        raise CleanupTooEarly("lesson retention period has not elapsed")
    prefix = str(job.get("objectPrefix", ""))
    expected_prefix = f"video-lessons/{task.uid}/{task.jobId}/"
    if prefix != expected_prefix:
        raise RuntimeError("cleanup object prefix failed validation")

    _, bucket = _storage()
    for blob in bucket.list_blobs(prefix=prefix):
        blob.delete(timeout=60)
    reference.delete()
    return "deleted"


def _job_ref(task: RenderTask):
    return _firestore().document(
        f"users/{task.uid}/videoJobs/{task.jobId}"
    )


def _load_and_claim_job(
    task: RenderTask,
) -> tuple[dict[str, Any], str] | None:
    reference = _job_ref(task)
    transaction = _firestore().transaction()
    lease_token = secrets.token_hex(16)

    @firestore.transactional
    def claim(transaction):
        snapshot = reference.get(transaction=transaction)
        if not snapshot.exists:
            return None
        job = snapshot.to_dict() or {}
        if job.get("uid") != task.uid or job.get("id") != task.jobId:
            return None
        if int(job.get("attempt", 0)) != task.attempt:
            return None
        now = int(time.time() * 1000)
        decision = _claim_decision(
            job.get("status"),
            job.get("updatedAt"),
            now,
        )
        if decision == "ignore":
            return None
        if decision == "busy":
            raise RenderLeaseBusy("another renderer owns this job")
        transaction.update(
            reference,
            {
                "status": "planning",
                "progress": 8,
                "stageLabel": "Designing a visual explanation",
                "updatedAt": now,
                "renderLease": lease_token,
                "error": firestore.DELETE_FIELD,
            },
        )
        return job, lease_token

    return claim(transaction)


def _update_job(
    task: RenderTask,
    lease_token: str,
    **fields: Any,
) -> None:
    reference = _job_ref(task)
    transaction = _firestore().transaction()

    @firestore.transactional
    def update(transaction):
        snapshot = reference.get(transaction=transaction)
        job = snapshot.to_dict() if snapshot.exists else {}
        if (
            int((job or {}).get("attempt", 0)) != task.attempt
            or (job or {}).get("renderLease") != lease_token
            or (job or {}).get("status") in TERMINAL_STATUSES
        ):
            raise RenderLeaseLost("the render lease is no longer active")
        fields["updatedAt"] = int(time.time() * 1000)
        transaction.update(reference, fields)

    update(transaction)


def _finish_without_charge(
    task: RenderTask,
    lease_token: str,
    *,
    status: str,
    code: str,
    message: str,
    retryable: bool,
) -> None:
    database = _firestore()
    job_reference = _job_ref(task)
    quota_reference = database.document(
        f"users/{task.uid}/entitlements/video"
    )
    transaction = database.transaction()

    @firestore.transactional
    def finish(transaction):
        job_snapshot = job_reference.get(transaction=transaction)
        quota_snapshot = quota_reference.get(transaction=transaction)
        if not job_snapshot.exists:
            return
        job = job_snapshot.to_dict() or {}
        if (
            int(job.get("attempt", 0)) != task.attempt
            or job.get("renderLease") != lease_token
        ):
            return
        charged = bool(job.get("quotaCharged"))
        quota = quota_snapshot.to_dict() if quota_snapshot.exists else {}
        now = int(time.time() * 1000)
        period_key = time.strftime("%Y-%m-%d", time.gmtime(now / 1000))
        stored_period_key = (quota or {}).get("periodKey")
        used = (
            max(0, int((quota or {}).get("used", 0)))
            if stored_period_key == period_key
            else 0
        )
        configured_limit = max(
            1,
            int(
                os.environ.get(
                    "VIDEO_FREE_LIMIT",
                    str(DEFAULT_DAILY_VIDEO_LIMIT),
                )
            ),
        )
        limit = max(
            configured_limit,
            int((quota or {}).get("limit", configured_limit)),
        )
        should_refund = (
            charged
            and job.get("quotaPeriodKey") == period_key
            and stored_period_key == period_key
        )
        used = max(0, used - (1 if should_refund else 0))
        transaction.update(
            job_reference,
            {
                "status": status,
                "progress": 0 if status == "failed" else 100,
                "stageLabel": (
                    "This problem needs a different visual format"
                    if status == "unsupported"
                    else "The lesson could not be generated"
                ),
                "quotaCharged": False,
                "updatedAt": now,
                "renderLease": firestore.DELETE_FIELD,
                "error": {
                    "code": code,
                    "message": message,
                    "retryable": retryable,
                },
            },
        )
        transaction.set(
            quota_reference,
            {
                "used": used,
                "limit": limit,
                "periodKey": period_key,
                "updatedAt": now,
            },
            merge=True,
        )

    finish(transaction)


def _load_offline_plan() -> LessonPlan | None:
    configured = os.environ.get("VIDEO_OFFLINE_PLAN_PATH", "").strip()
    if not configured:
        return None
    return LessonPlan.model_validate_json(
        Path(configured).read_text(encoding="utf-8")
    )


def _planning_attempt_limit() -> int:
    try:
        configured = int(os.environ.get("VIDEO_PLAN_ATTEMPTS", "2"))
    except ValueError:
        configured = 2
    return max(1, min(configured, 3))


def _create_reviewed_plan(
    task: RenderTask,
    lease_token: str,
    problem: str,
    solution: str,
) -> LessonPlan:
    feedback: str | None = None
    attempts = _planning_attempt_limit()
    last_failure_was_generation = False

    for attempt_index in range(attempts):
        try:
            plan = create_lesson_plan(
                problem,
                solution,
                correction=feedback,
            )
        except GeminiValidationError as error:
            last_failure_was_generation = True
            feedback = (
                "The previous plan failed the deterministic lesson contract. "
                "Correct every issue below, while preserving mathematical "
                "accuracy:\n"
                f"{json.dumps(error.feedback, ensure_ascii=False)}"
            )
        else:
            last_failure_was_generation = False
            if plan.supported:
                _update_job(
                    task,
                    lease_token,
                    status="planning",
                    progress=min(18, 14 + attempt_index * 2),
                    stageLabel="Checking the math and teaching plan",
                )
                review = review_lesson_plan(problem, solution, plan)
                if review.valid:
                    return plan
                feedback = review.reason or (
                    "The independent math review found an inconsistency."
                )
            else:
                feedback = plan.unsupportedReason or (
                    "The previous plan did not select a safe visual lesson."
                )

        if attempt_index + 1 < attempts:
            _update_job(
                task,
                lease_token,
                status="planning",
                progress=min(18, 12 + attempt_index * 2),
                stageLabel="Refining the lesson plan",
            )

    if last_failure_was_generation:
        raise LessonPlanningFailed(
            "The bounded planner could not satisfy the lesson contract."
        )
    raise UnsupportedLesson(
        "The bounded planning and math review could not approve a lesson."
    )


def _voice_plan(
    task: RenderTask,
    lease_token: str,
    plan: LessonPlan,
    work_dir: Path,
) -> list[list[VoiceResult]]:
    voice_dir = work_dir / "voice"
    voice_dir.mkdir(parents=True, exist_ok=True)
    jobs: list[tuple[int, int, str, Path]] = []
    for clip_index, clip in enumerate(plan.clips):
        for segment_index, segment in enumerate(clip.segments):
            path = (
                voice_dir
                / f"{clip_index + 1:02d}-{segment_index + 1:02d}.wav"
            )
            jobs.append((clip_index, segment_index, segment.narration, path))

    maximum_workers = max(
        1,
        min(
            int(os.environ.get("VIDEO_TTS_WORKERS", "2")),
            len(jobs),
            4,
        ),
    )
    results: dict[tuple[int, int], VoiceResult] = {}
    completed = 0

    def generate(job: tuple[int, int, str, Path]):
        clip_index, segment_index, narration, destination = job
        result = synthesize_verified_phrase(narration, destination)
        return clip_index, segment_index, result

    with concurrent.futures.ThreadPoolExecutor(
        max_workers=maximum_workers
    ) as executor:
        futures = [executor.submit(generate, job) for job in jobs]
        for future in concurrent.futures.as_completed(futures):
            clip_index, segment_index, result = future.result()
            results[(clip_index, segment_index)] = result
            completed += 1
            progress = 20 + round(24 * completed / max(1, len(jobs)))
            _update_job(
                task,
                lease_token,
                status="voicing",
                progress=progress,
                stageLabel=f"Recording narration {completed} of {len(jobs)}",
            )

    return [
        [
            results[(clip_index, segment_index)]
            for segment_index in range(len(clip.segments))
        ]
        for clip_index, clip in enumerate(plan.clips)
    ]


def _content_type(path: Path) -> str:
    return {
        ".mp4": "video/mp4",
        ".vtt": "text/vtt; charset=utf-8",
        ".jpg": "image/jpeg",
        ".json": "application/json; charset=utf-8",
    }.get(path.suffix.lower(), "application/octet-stream")


def _interaction_manifest(value: LessonInteraction) -> dict[str, Any]:
    return value.model_dump(mode="json", exclude_none=True)


def _delivery_interactions(
    plan: LessonPlan,
    clips: list[RenderedClip],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    transfer_check = _interaction_manifest(plan.transferCheck)
    if len(clips) == 1 and clips[0].id == "full-lesson":
        transfer_check["afterClip"] = clips[0].id
        return [], transfer_check
    return (
        [_interaction_manifest(value) for value in plan.interactions],
        transfer_check,
    )


def _upload_file(
    bucket: storage.Bucket,
    local_path: Path,
    object_key: str,
) -> str:
    blob = bucket.blob(object_key)
    blob.cache_control = "private, max-age=3600"
    blob.upload_from_filename(
        str(local_path),
        content_type=_content_type(local_path),
        timeout=180,
    )
    return object_key


def _upload_lesson(
    task: RenderTask,
    job: dict[str, Any],
    plan: LessonPlan,
    clips: list[RenderedClip],
    work_dir: Path,
) -> str:
    _, bucket = _storage()
    prefix = str(job.get("objectPrefix", ""))
    expected_prefix = f"video-lessons/{task.uid}/{task.jobId}/"
    if prefix != expected_prefix:
        raise RuntimeError("job object prefix failed validation")

    manifest_clips: list[dict[str, Any]] = []
    for index, clip in enumerate(clips):
        base = f"{index + 1:02d}-{clip.id}"
        video_key = _upload_file(
            bucket, clip.video_path, f"{prefix}clips/{base}.mp4"
        )
        captions_key = _upload_file(
            bucket, clip.captions_path, f"{prefix}captions/{base}.vtt"
        )
        poster_key = _upload_file(
            bucket, clip.poster_path, f"{prefix}posters/{base}.jpg"
        )
        manifest_clips.append(
            {
                "id": clip.id,
                "step": clip.step,
                "title": clip.title,
                "durationSeconds": clip.duration_seconds,
                "videoObjectKey": video_key,
                "captionsObjectKey": captions_key,
                "posterObjectKey": poster_key,
            }
        )

    # The renderer still plans several teaching scenes so the explanation has
    # a real pedagogical arc, but users receive one uninterrupted movie.
    # Optional practice therefore happens only after that movie.
    interactions, transfer_check = _delivery_interactions(plan, clips)

    manifest = {
        "schemaVersion": 1,
        "lessonId": task.jobId,
        "title": plan.title,
        "problem": plan.problem,
        "learningGoal": plan.learningGoal,
        "disclosure": DISCLOSURE,
        "clips": manifest_clips,
        "interactions": interactions,
        "transferCheck": transfer_check,
        "completion": plan.completion.model_dump(mode="json"),
    }
    manifest_path = work_dir / "lesson-manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    manifest_key = f"{prefix}manifest.json"
    _upload_file(bucket, manifest_path, manifest_key)
    return manifest_key


def process_render_task(task: RenderTask) -> str:
    claim = _load_and_claim_job(task)
    if claim is None:
        return "ignored"
    job, lease_token = claim
    phase = "planning"

    try:
        offline_plan = _load_offline_plan()
        if offline_plan is None:
            phase = "reviewing"
            plan = _create_reviewed_plan(
                task,
                lease_token,
                str(job.get("problem", "")),
                str(job.get("solution", "")),
            )
        else:
            plan = offline_plan
            if not plan.supported:
                raise UnsupportedLesson(
                    plan.unsupportedReason
                    or "No safe visual template was selected."
                )

        with tempfile.TemporaryDirectory(
            prefix=f"mathsolver-video-{task.jobId[:8]}-"
        ) as temporary:
            work_dir = Path(temporary)
            phase = "voicing"
            audio = _voice_plan(task, lease_token, plan, work_dir)
            _update_job(
                task,
                lease_token,
                status="rendering",
                progress=48,
                stageLabel="Drawing the lesson",
            )
            phase = "rendering"
            clips = render_lesson_clips(plan, audio, work_dir / "output")
            _update_job(
                task,
                lease_token,
                status="verifying",
                progress=82,
                stageLabel="Checking video, voice, and captions",
            )
            if not clips or any(
                clip.duration_seconds <= 0 or not clip.video_path.exists()
                for clip in clips
            ):
                raise RuntimeError("rendered media failed verification")
            if any(clip.transcript_similarity < 0.82 for clip in clips):
                raise RuntimeError("voice verification failed")

            _update_job(
                task,
                lease_token,
                status="uploading",
                progress=90,
                stageLabel="Preparing private playback",
            )
            phase = "uploading"
            manifest_key = _upload_lesson(
                task,
                job,
                plan,
                clips,
                work_dir,
            )

        _update_job(
            task,
            lease_token,
            status="ready",
            progress=100,
            stageLabel="Your visual lesson is ready",
            manifestObjectKey=manifest_key,
            renderLease=firestore.DELETE_FIELD,
            error=firestore.DELETE_FIELD,
        )
        try:
            _notify_lesson_ready(task)
        except Exception as error:
            LOGGER.warning(
                "Video-ready notification failed type=%s",
                type(error).__name__,
            )
        return "ready"
    except RenderLeaseLost:
        LOGGER.info("Video job %s lost its render lease", task.jobId)
        return "ignored"
    except LessonPlanningFailed as error:
        LOGGER.info(
            "Video job %s could not produce a valid plan: %s",
            task.jobId,
            type(error).__name__,
        )
        _finish_without_charge(
            task,
            lease_token,
            status="failed",
            code="planning_failed",
            message=(
                "The video teacher could not finish a trustworthy teaching "
                "plan. Your free lesson was not used, so you can retry."
            ),
            retryable=True,
        )
        return "failed"
    except UnsupportedLesson as error:
        LOGGER.info(
            "Video job %s was unsupported: %s",
            task.jobId,
            type(error).__name__,
        )
        _finish_without_charge(
            task,
            lease_token,
            status="unsupported",
            code="lesson_not_supported",
            message=(
                "We could not create a trustworthy visual lesson for this "
                "problem yet. Your free lesson was not used."
            ),
            retryable=task.attempt < MAX_EXTERNAL_UNSUPPORTED_ATTEMPTS,
        )
        return "unsupported"
    except Exception as error:
        LOGGER.exception(
            "Video job %s failed during %s in %s",
            task.jobId,
            phase,
            type(error).__name__,
        )
        _finish_without_charge(
            task,
            lease_token,
            status="failed",
            code="render_failed",
            message=(
                "The video studio could not finish this lesson. Your free "
                "lesson was not used, so you can retry."
            ),
            retryable=True,
        )
        return "failed"
