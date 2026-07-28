from __future__ import annotations

import logging
import os

from fastapi import FastAPI, Header, HTTPException

from models import CleanupTask, RenderTask
from pipeline import (
    CleanupTooEarly,
    RenderLeaseBusy,
    cleanup_expired_lesson,
    process_render_task,
)


logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

app = FastAPI(
    title="MathSolver Video Renderer",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/render")
def render(
    task: RenderTask,
    x_video_render_secret: str | None = Header(default=None),
) -> dict[str, str]:
    direct_secret = os.environ.get("VIDEO_DIRECT_RENDER_SECRET", "")
    # Production Cloud Run IAM authenticates Cloud Tasks before the request
    # reaches this container. Local/direct mode uses this separate shared secret.
    if not os.environ.get("K_SERVICE") and (
        not direct_secret or x_video_render_secret != direct_secret
    ):
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        result = process_render_task(task)
    except RenderLeaseBusy as error:
        raise HTTPException(
            status_code=503,
            detail="A renderer is already processing this lesson.",
            headers={"Retry-After": "30"},
        ) from error
    return {"status": result}


@app.post("/cleanup")
def cleanup(
    task: CleanupTask,
    x_video_render_secret: str | None = Header(default=None),
) -> dict[str, str]:
    direct_secret = os.environ.get("VIDEO_DIRECT_RENDER_SECRET", "")
    if not os.environ.get("K_SERVICE") and (
        not direct_secret or x_video_render_secret != direct_secret
    ):
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        return {"status": cleanup_expired_lesson(task)}
    except CleanupTooEarly as error:
        raise HTTPException(
            status_code=503,
            detail="The lesson retention period has not elapsed.",
            headers={"Retry-After": "60"},
        ) from error
