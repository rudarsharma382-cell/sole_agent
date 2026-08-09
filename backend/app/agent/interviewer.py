"""LLM-powered interview orchestration with RAG context."""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

# No google imports needed for DeepSeek

from app.agent.errors import (
    LLMAuthError,
    LLMNotConfiguredError,
    LLMRateLimitError,
    LLMResponseError,
    LLMUnavailableError,
    RetrievalUnavailableError,
    SessionNotFoundError,
)
from app.agent.planner import plan_interview_days
from app.agent.session import InterviewSession, session_store
from app.config import settings
from app.engine import client as openai_client, get_model_name
from app.rag.retriever import PersonalizedRetriever

logger = logging.getLogger(__name__)

MAX_LLM_ATTEMPTS = 3
RETRY_BACKOFF_SECONDS = 1.5

# Stops a runaway interview if the model never chooses to conclude.
HARD_QUESTION_CAP = 16


SYSTEM_PROMPT = """You are a senior AI engineering interviewer for the AI Cohort (31 days, 8 modules).

Goals:
- Run a realistic technical interview (not a quiz script).
- Assess understanding of concepts the candidate completed.
- Ask intelligent follow-ups based on their answers.
- Cover at least {min_days} different curriculum days and ask at least {min_questions} questions before ending.
- Stay conversational, concise, and professional.

Rules:
1. Use the retrieved curriculum context and candidate mission history.
2. Prefer depth on high-attempt or core topics (RAG, vectors, prompting, agents, MCP, deployment).
3. For skipped topics, ask light conceptual questions only.
4. After each candidate answer, either ask a follow-up OR move to a new topic.
5. Track coverage mentally using planned_days and questions_asked.
6. When questions_asked >= {min_questions} AND at least {min_days} days are covered, end the interview.
7. When ending, set done=true and provide structured feedback.

Always respond with a single JSON object (no markdown fences):
{{
  "reply": "what you say to the candidate",
  "done": false,
  "question_increment": 1,
  "day_touched": 11,
  "feedback": null
}}

When finished:
{{
  "reply": "Interview completed. ...short closing...",
  "done": true,
  "question_increment": 0,
  "day_touched": null,
  "feedback": {{
    "summary": "...",
    "strengths": ["..."],
    "gaps": ["..."],
    "next": ["..."]
  }}
}}
"""


class InterviewAgent:
    def __init__(self, retriever: PersonalizedRetriever | None = None):
        # Built on first use: the embedding model loads from disk/network, which
        # must not happen at import time or the whole API fails to boot.
        self._retriever = retriever
        self._client: Any = None

    @property
    def retriever(self) -> PersonalizedRetriever:
        if self._retriever is None:
            try:
                self._retriever = PersonalizedRetriever()
            except Exception as exc:
                raise RetrievalUnavailableError(
                    f"Could not open the curriculum vector store: {exc}",
                    hint="Run `python -m app.rag.ingest` from backend/ to build the index.",
                ) from exc
        return self._retriever

    @property
    def client(self) -> Any:
        if not settings.openrouter_api_key:
            raise LLMNotConfiguredError(
                "No OpenRouter API key configured, so the interviewer cannot generate questions.",
                hint="Set OPENROUTER_API_KEY in .env, then restart the server.",
            )
        return openai_client

    def start(self, session_id: str, candidate: dict[str, Any]) -> dict[str, Any]:
        session = session_store.create(session_id, candidate)
        session.planned_days = plan_interview_days(candidate)
        hits = self.retriever.retrieve_for_candidate(
            candidate, focus_days=session.planned_days
        )
        context = self.retriever.format_context(hits)

        user_payload = {
            "phase": "start",
            "candidate": candidate,
            "planned_days": session.planned_days,
            "questions_asked": 0,
            "min_questions": settings.min_questions,
            "min_curriculum_days": settings.min_curriculum_days,
            "retrieved_context": context,
            "instruction": (
                "Welcome the candidate by name, briefly state you will interview them "
                "on their cohort journey, then ask the first technical question tied to "
                "one of the planned days."
            ),
        }
        result = self._call_llm(session, user_payload)
        self._apply_result(session, result, candidate_message=None)
        session_store.upsert(session)
        return self._response(session, result)

    def turn(self, session_id: str, message: str) -> dict[str, Any]:
        session = session_store.get(session_id)
        if session is None:
            raise SessionNotFoundError(
                f"No active interview for session '{session_id}'.",
                hint="The server may have restarted. Start a new interview to continue.",
            )
        if session.done:
            return {
                "reply": "This interview is already complete.",
                "done": True,
                "feedback": session.feedback,
                "progress": session.progress(),
            }

        hits = self.retriever.retrieve_for_candidate(
            session.candidate,
            query=message,
            focus_days=session.planned_days,
        )
        context = self.retriever.format_context(hits)

        should_wrap = session.meets_completion_bar()

        user_payload = {
            "phase": "turn",
            "candidate_message": message,
            "candidate": session.candidate,
            "planned_days": session.planned_days,
            "covered_days": session.covered_days,
            "questions_asked": session.questions_asked,
            "min_questions": settings.min_questions,
            "min_curriculum_days": settings.min_curriculum_days,
            "should_conclude": should_wrap,
            "retrieved_context": context,
            "instruction": (
                "Evaluate the answer. Ask a sharp follow-up OR next topic question. "
                "If should_conclude is true, end with done=true and structured feedback."
            ),
        }
        result = self._call_llm(session, user_payload)
        self._apply_result(session, result, candidate_message=message)
        session_store.upsert(session)
        return self._response(session, result)

    def _call_llm(self, session: InterviewSession, payload: dict[str, Any]) -> dict[str, Any]:
        system = SYSTEM_PROMPT.format(
            min_days=settings.min_curriculum_days,
            min_questions=settings.min_questions,
        )
        messages = [
            {"role": "system", "content": system}
        ]
        for msg in session.messages[-12:]:
            role = "assistant" if msg["role"] == "assistant" else "user"
            messages.append({"role": role, "content": msg["content"]})
        
        messages.append({"role": "user", "content": json.dumps(payload, ensure_ascii=False)})

        raw = self._generate_with_retries(messages)
        result = self._parse_json(raw)

        if not str(result.get("reply") or "").strip():
            raise LLMResponseError(
                "The model returned an empty interview reply.",
                hint="Retry the turn; if it persists, try a different DEEPSEEK_MODEL.",
            )
        return result

    def _generate_with_retries(
        self,
        messages: list[dict[str, str]],
    ) -> str:
        """Call OpenRouter, retrying only failures that are plausibly transient."""
        if not settings.openrouter_api_key:
            raise LLMNotConfiguredError(
                "No OpenRouter API key configured.",
                hint="Set OPENROUTER_API_KEY in .env, then restart the server.",
            )

        last_error: Exception | None = None

        for attempt in range(1, MAX_LLM_ATTEMPTS + 1):
            try:
                try:
                    response = openai_client.chat.completions.create(
                        model=get_model_name(),
                        messages=messages,
                        temperature=0.4,
                        max_tokens=1500,
                        response_format={"type": "json_object"}
                    )
                except Exception as json_mode_exc:
                    # If JSON mode is not supported by the model, OpenRouter might return a 400.
                    # Retry without JSON mode.
                    if "format" in str(json_mode_exc).lower() or "400" in str(json_mode_exc):
                        response = openai_client.chat.completions.create(
                            model=get_model_name(),
                            messages=messages,
                            temperature=0.4,
                            max_tokens=1500
                        )
                    else:
                        raise json_mode_exc

                text = (response.choices[0].message.content or "").strip()
                if text:
                    return text
                last_error = LLMResponseError("Model returned empty content.")
            except Exception as exc:
                if isinstance(exc, (LLMAuthError, LLMNotConfiguredError, LLMRateLimitError)):
                    raise exc
                mapped = self._classify_provider_error(exc)
                last_error = mapped

            if attempt < MAX_LLM_ATTEMPTS:
                delay = RETRY_BACKOFF_SECONDS * attempt
                logger.warning(
                    "OpenRouter call failed (attempt %s/%s), retrying in %.1fs: %s",
                    attempt,
                    MAX_LLM_ATTEMPTS,
                    delay,
                    last_error,
                )
                time.sleep(delay)

        if isinstance(last_error, (LLMRateLimitError, LLMResponseError)):
            raise last_error
        raise LLMUnavailableError(
            f"OpenRouter did not respond successfully after {MAX_LLM_ATTEMPTS} attempts.",
            hint="Check your network connection and API key status, then retry.",
        )

    def _classify_provider_error(self, exc: Exception) -> Exception:
        """Turn an opaque exception into an actionable typed error."""
        text = str(exc).lower()

        if "api key not valid" in text or "api_key_invalid" in text or "unauthorized" in text or "401" in text:
            return LLMAuthError(
                "OpenRouter rejected the configured API key.",
                hint="OPENROUTER_API_KEY looks invalid. Double check the sk-or-v1 key in backend/.env.",
            )
        if "permission" in text or "403" in text:
            return LLMAuthError(
                "OpenRouter denied access for this API key.",
                hint="Check if your OpenRouter account is active or has sufficient credits.",
            )
        if "quota" in text or "rate limit" in text or "429" in text:
            return LLMRateLimitError(
                "OpenRouter rate limit reached.",
                hint="Wait a few seconds before sending the next answer, or verify account balance.",
            )
        return LLMUnavailableError(f"OpenRouter request failed: {exc}")

    def _parse_json(self, raw: str) -> dict[str, Any]:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass

        # Models occasionally wrap JSON in prose or fences; salvage the object.
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass

        # Plain prose is still a usable interviewer turn.
        if raw.strip():
            return {
                "reply": raw.strip(),
                "done": False,
                "question_increment": 1,
                "day_touched": None,
                "feedback": None,
            }

        raise LLMResponseError("Could not parse a reply from the model response.")

    def _apply_result(
        self,
        session: InterviewSession,
        result: dict[str, Any],
        candidate_message: str | None,
    ) -> None:
        if candidate_message is not None:
            session.messages.append({"role": "user", "content": candidate_message})

        reply = str(result.get("reply") or "").strip()
        if reply:
            session.messages.append({"role": "assistant", "content": reply})

        inc = int(result.get("question_increment") or 0)
        if inc > 0:
            session.questions_asked += inc

        day = result.get("day_touched")
        if day is not None:
            try:
                day_i = int(day)
                if day_i not in session.covered_days:
                    session.covered_days.append(day_i)
            except (TypeError, ValueError):
                pass

        model_wants_to_end = bool(result.get("done"))
        at_hard_cap = session.questions_asked >= HARD_QUESTION_CAP

        # The spec sets a floor on coverage, so a premature wrap-up is ignored
        # unless we have hit the cap that stops runaway interviews.
        if model_wants_to_end and not (session.meets_completion_bar() or at_hard_cap):
            logger.info(
                "Ignoring early completion for %s (%s questions, %s days covered)",
                session.session_id,
                session.questions_asked,
                len(set(session.covered_days)),
            )
            return

        if model_wants_to_end or at_hard_cap:
            session.done = True
            feedback = result.get("feedback") or {}
            session.feedback = {
                "summary": str(feedback.get("summary") or "Interview completed."),
                "strengths": [str(s) for s in (feedback.get("strengths") or [])],
                "gaps": [str(g) for g in (feedback.get("gaps") or [])],
                "next": [str(n) for n in (feedback.get("next") or [])],
            }

    def _response(self, session: InterviewSession, result: dict[str, Any]) -> dict[str, Any]:
        reply = str(result.get("reply") or "").strip()
        payload: dict[str, Any] = {
            "reply": reply,
            "done": session.done,
            "progress": session.progress(),
        }
        if session.done and session.feedback:
            payload["feedback"] = session.feedback
        return payload


interview_agent = InterviewAgent()
