import logging

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic_ai import Agent

from api.models import ChatRequest, SummarizeRequest, SummarizeResponse
from services.streaming import stream_chat
from config.config import settings

log = logging.getLogger(__name__)

router = APIRouter(prefix="/llm", tags=["LLM"])


# ── Summarizer (reused across requests) ─────────────────────────────

_summarizer = Agent(
    model=settings.llm_model,
    system_prompt=(
        "You generate very short titles (maximum 5 words) that summarize a user message. "
        "Reply ONLY with the title. No quotes, no punctuation at the end, no explanation."
    ),
)


# ── Routes ──────────────────────────────────────────────────────────


@router.post(
    "/chat",
    summary="Chat (SSE stream)",
    description=(
        "Send a conversation and receive the agent's reply as a Server-Sent Event stream. "
        "Events: `content`, `thinking`, `tool_call`, `tool_result`, `error`, `Done`."
    ),
    responses={
        200: {
            "content": {"text/event-stream": {}},
            "description": "SSE stream of agent events.",
        },
    },
)
async def chat(request: ChatRequest):
    """Stream agent responses as Server-Sent Events."""
    return StreamingResponse(
        stream_chat(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/summarize", summary="Summarize a message into a short title", response_model=SummarizeResponse)
async def summarize(request: SummarizeRequest) -> SummarizeResponse:
    """Ask the LLM for a ≤5-word title for a conversation."""
    result = await _summarizer.run(request.message)
    title = result.output.strip().strip('"').strip("'")
    return SummarizeResponse(title=title)
