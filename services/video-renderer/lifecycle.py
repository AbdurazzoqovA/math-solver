from __future__ import annotations

import re
from typing import Any


RENDER_LEASE_MS = 10 * 60 * 1_000
CLEANUP_EARLY_TOLERANCE_MS = 60_000
MAX_RENDER_ATTEMPTS = 20
ACTIVE_STATUSES = {
    "planning",
    "voicing",
    "rendering",
    "verifying",
    "uploading",
}
TERMINAL_STATUSES = {"ready", "unsupported", "failed"}
LEASE_TOKEN = re.compile(r"^[a-f0-9]{32}$")
LEGACY_LESSON_OBJECT = re.compile(
    r"^(?:manifest\.json|clips/[^/]+\.mp4|captions/[^/]+\.vtt|"
    r"posters/[^/]+\.jpg)$"
)


def claim_decision(
    status: Any,
    updated_at: Any,
    now_ms: int,
) -> str:
    if status == "queued":
        return "claim"
    if status in TERMINAL_STATUSES:
        return "ignore"
    if status in ACTIVE_STATUSES:
        # A Cloud Tasks retry does not prove the preceding HTTP worker stopped;
        # only the persisted lease age may authorize a replacement renderer.
        if not isinstance(updated_at, (int, float)):
            return "claim"
        return (
            "claim"
            if now_ms - int(updated_at) >= RENDER_LEASE_MS
            else "busy"
        )
    return "ignore"


def cleanup_decision(
    job_expires_at: int | None,
    scheduled_expires_at: int | None,
    now_ms: int,
) -> str:
    effective_expiry = (
        scheduled_expires_at
        if scheduled_expires_at is not None
        else job_expires_at
    )
    if (
        effective_expiry is not None
        and effective_expiry > now_ms + CLEANUP_EARLY_TOLERANCE_MS
    ):
        return "early"
    if scheduled_expires_at is None:
        return "delete" if job_expires_at is not None else "stale"
    if job_expires_at != scheduled_expires_at:
        return "stale"
    return "delete"


def legacy_object_prefix(uid: str, job_id: str) -> str:
    return f"video-lessons/{uid}/{job_id}/"


def generation_object_prefix(uid: str, job_id: str, expires_at: int) -> str:
    return f"video-lessons/v2/{uid}/{job_id}/{int(expires_at)}/"


def is_valid_object_prefix(
    prefix: str,
    uid: str,
    job_id: str,
    expires_at: int | None,
) -> bool:
    if prefix == legacy_object_prefix(uid, job_id):
        return True
    return expires_at is not None and prefix == generation_object_prefix(
        uid,
        job_id,
        expires_at,
    )


def lease_object_prefix(job_prefix: str, lease_token: str) -> str:
    if not LEASE_TOKEN.fullmatch(lease_token):
        raise ValueError("render lease token failed validation")
    return f"{job_prefix}leases/{lease_token}/"


def is_legacy_job_object_name(relative_name: str) -> bool:
    parts = relative_name.split("/", 2)
    if (
        len(parts) == 3
        and parts[0] == "leases"
        and LEASE_TOKEN.fullmatch(parts[1])
    ):
        relative_name = parts[2]
    return LEGACY_LESSON_OBJECT.fullmatch(relative_name) is not None
