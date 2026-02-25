import asyncio
import json
import logging
from typing import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from pydantic_ai.messages import (
    ModelRequest,
    ModelResponse,
    UserPromptPart,
    TextPart,
)

from agent.agent import get_agent
from agent.context import AgentContext
from data.loader import get_datasets, get_dataset_info_str

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/llm", tags=["llm"])


# ── Schemas ──────────────────────────────────────────────────


class MessagePayload(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[MessagePayload]


# ── Helpers ──────────────────────────────────────────────────


def format_sse(event: str, content: str) -> str:
    """Format a Server-Sent Event string with a text content payload."""
    payload = json.dumps({"content": content})
    return f"event: {event}\ndata: {payload}\n\n"


def format_sse_data(event: str, data: dict) -> str:
    """Format a Server-Sent Event string with an arbitrary JSON payload."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def build_message_history(messages: list[MessagePayload]):
    """Convert frontend messages to pydantic-ai ModelMessage objects."""
    history = []
    for msg in messages:
        if msg.role == "user":
            history.append(ModelRequest(parts=[UserPromptPart(content=msg.content)]))
        elif msg.role == "assistant":
            history.append(ModelResponse(parts=[TextPart(content=msg.content)]))
    return history


# Sentinel to signal "stream finished" on the output queue
_DONE = object()


# ── Stream generator ─────────────────────────────────────────


async def generate_stream(request: ChatRequest) -> AsyncGenerator[str, None]:
    """
    Run the agent and yield SSE events in real-time.

    A background task runs `stream_text()`.  Intermediate tool events are
    pushed onto an asyncio.Queue by the tools themselves and consumed here
    so the client sees them the moment they happen — not after the whole
    agentic loop finishes.
    """
    agent = get_agent()
    datasets = get_datasets()
    dataset_info = get_dataset_info_str()

    ctx = AgentContext(
        datasets=datasets,
        dataset_info=dataset_info,
    )

    history = build_message_history(request.messages[:-1])
    user_prompt = request.messages[-1].content

    # Single output queue consumed by the SSE generator.
    # Items are SSE-formatted strings; _DONE signals completion.
    out_q: asyncio.Queue[str | object] = asyncio.Queue()

    async def _run_agent():
        """Background coroutine that drives the agent and feeds out_q."""
        try:
            async with agent.run_stream(
                user_prompt,
                deps=ctx,
                message_history=history if history else None,
            ) as result:
                

                async for delta in result.stream_text(delta=True):
                    await out_q.put(format_sse("Content", delta))
        except asyncio.CancelledError:
            logger.info("Client disconnected, agent task cancelled")
            return
        except Exception as e:
            logger.error(f"Streaming error: {e}", exc_info=True)
            await out_q.put(format_sse("Error", str(e)))
        finally:
            await out_q.put(_DONE)

    async def _relay_tool_events():
        """Forward tool events from ctx.event_queue → out_q in real-time."""
        try:
            while True:
                item = await ctx.event_queue.get()
                if item is None:  # poison pill
                    return
                evt_type, data = item
                await out_q.put(format_sse_data(evt_type, data))
        except asyncio.CancelledError:
            return

    agent_task = asyncio.create_task(_run_agent())
    relay_task = asyncio.create_task(_relay_tool_events())

    try:
        while True:
            item = await out_q.get()
            if item is _DONE:
                break
            yield item
    except asyncio.CancelledError:
        logger.info("Client disconnected, stream cancelled")
        agent_task.cancel()
        return
    finally:
        # Stop the relay task
        await ctx.event_queue.put(None)
        relay_task.cancel()
        await asyncio.gather(agent_task, relay_task, return_exceptions=True)

    yield "event: Done\ndata: {}\n\n"


# ── Route ────────────────────────────────────────────────────


@router.post("/chat")
async def chat(request: ChatRequest):
    """SSE streaming chat endpoint."""
    return StreamingResponse(
        generate_stream(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
