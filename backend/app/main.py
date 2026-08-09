"""FastAPI entrypoint — POST /api/interview."""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.agent.errors import InterviewError, InvalidRequestError
from app.agent.interviewer import interview_agent
from app.agent.session import session_store
from app.config import settings
from app.rag.store import get_vector_store

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Interview Agent",
    description="Personalized technical interviews grounded in AI Cohort curriculum via RAG",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class InterviewRequest(BaseModel):
    sessionId: str = Field(..., min_length=1)
    candidate: dict[str, Any] | None = None
    message: str | None = None


class FeedbackModel(BaseModel):
    summary: str
    strengths: list[str]
    gaps: list[str]
    next: list[str]


class ProgressModel(BaseModel):
    questionsAsked: int
    minQuestions: int
    coveredDays: list[int]
    plannedDays: list[int]
    daysCovered: int
    minDays: int
    done: bool


class InterviewResponse(BaseModel):
    reply: str
    done: bool
    feedback: FeedbackModel | None = None
    progress: ProgressModel | None = None


@app.exception_handler(InterviewError)
async def interview_error_handler(_: Request, exc: InterviewError) -> JSONResponse:
    """Return the machine-readable code and hint the UI shows to the user."""
    logger.warning("%s: %s", exc.code, exc.message)
    return JSONResponse(status_code=exc.status, content={"error": exc.to_payload()})


@app.get("/")
def read_root() -> dict[str, str]:
    """Returns a welcome message indicating the backend is active."""
    return {
        "message": "SOLE_AGENT FastAPI Backend is active",
        "health_check": "/health",
        "docs": "/docs"
    }


@app.get("/health")
def health() -> dict[str, Any]:
    """Reports whether both dependencies of an interview are usable."""
    rag_chunks = -1
    rag_error: str | None = None
    try:
        rag_chunks = get_vector_store().count()
    except Exception as exc:
        rag_error = str(exc)

    rag_ready = rag_chunks > 0
    llm_ready = bool(settings.openrouter_api_key)

    return {
        "status": "ok" if (rag_ready and llm_ready) else "degraded",
        "rag_chunks": rag_chunks,
        "rag_ready": rag_ready,
        "rag_error": rag_error,
        "llm_ready": llm_ready,
        "model": settings.model_name,
        "active_sessions": session_store.count(),
        "min_questions": settings.min_questions,
        "min_days": settings.min_curriculum_days,
    }


@app.get("/api/candidates")
def list_candidates() -> dict[str, Any]:
    """Candidate profiles, so clients don't need their own copy of the data."""
    if not settings.candidates_path.exists():
        raise InterviewError(
            "Candidate profiles are not available on the server.",
            hint=f"Expected candidates.json at {settings.candidates_path}",
        )

    try:
        data = json.loads(settings.candidates_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise InterviewError(f"candidates.json is not valid JSON: {exc}") from exc

    return {"candidates": data.get("candidates", [])}


@app.post("/api/interview", response_model=InterviewResponse)
def interview(body: InterviewRequest) -> dict[str, Any]:
    session_id = body.sessionId.strip()
    if not session_id:
        raise InvalidRequestError("sessionId must not be blank.")

    # A candidate with no message starts a fresh interview.
    if body.candidate is not None and not body.message:
        return interview_agent.start(session_id, body.candidate)

    if body.message is not None:
        message = body.message.strip()
        if not message:
            raise InvalidRequestError(
                "message must not be empty.",
                hint="Send the candidate's answer text as `message`.",
            )

        # Tolerate a client that sends candidate + message on the first call.
        if session_store.get(session_id) is None and body.candidate is not None:
            interview_agent.start(session_id, body.candidate)

        return interview_agent.turn(session_id, message)

    raise InvalidRequestError(
        "Provide `candidate` to start an interview, or `message` to continue one.",
    )


@app.delete("/api/interview/{session_id}")
def end_session(session_id: str) -> dict[str, Any]:
    """Let clients release a session without waiting for the interview to finish."""
    return {"deleted": session_store.delete(session_id)}


@app.post("/api/rag/ingest")
def reingest() -> dict[str, Any]:
    """Optional helper to (re)build the vector index at runtime."""
    from app.rag.ingest import ingest

    try:
        get_vector_store.cache_clear()  # type: ignore[attr-defined]
    except Exception:
        pass

    try:
        return ingest(reset=True)
    except FileNotFoundError as exc:
        raise InterviewError(f"Cannot ingest: {exc}") from exc
