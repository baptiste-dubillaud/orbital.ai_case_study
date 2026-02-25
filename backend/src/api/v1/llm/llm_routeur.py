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
    ThinkingPartDelta,
    TextPartDelta,
    PartDeltaEvent,
    FunctionToolCallEvent,
    FunctionToolResultEvent,
    ToolReturnPart,
    RetryPromptPart,
    TextPart,
)

from agent.agent import get_agent
from agent.context import AgentContext
from data.loader import get_datasets, get_dataset_info_str

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/llm", tags=["llm"])


class MessagePayload(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[MessagePayload]


def format_sse(event: str, content: str | dict) -> str:
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

    logger.info(f"Received chat request with prompt: {user_prompt} and history of {len(history)} messages")

    try:
        async for event in agent.run_stream_events(
            user_prompt,
            deps=ctx,
            message_history=history if history else None,
        ):
            
            # Text content delta
            if isinstance(event, PartDeltaEvent) and isinstance(event.delta, TextPartDelta):
                logger.debug(f"Got text delta: {event.delta.content_delta}")
                yield format_sse(event="content", content=event.delta.content_delta)

            # Thinking delta
            elif isinstance(event, PartDeltaEvent) and isinstance(event.delta, ThinkingPartDelta):
                logger.debug(f"Got thinking delta: {event.delta.content_delta}")
                yield format_sse(event="thinking", content=event.delta.content_delta)

            # Tool call fired
            elif isinstance(event, FunctionToolCallEvent):
                logger.debug(f"Got tool call event: {event.part.tool_name} with args {event.part.args}")
                yield format_sse_data(
                    event="tool_call",
                    data={
                        "tool_name": event.part.tool_name,
                        "args": event.part.args,
                        "tool_call_id": event.part.tool_call_id,
                    },
                )

            # Tool result returned
            elif isinstance(event, FunctionToolResultEvent):
                if isinstance(event.result, ToolReturnPart):
                    logger.debug(f"Got tool result event: {event.tool_call_id} with result {event.result.content}")
                    yield format_sse_data(
                        event="tool_result",
                        data={
                            "result": event.result.content,
                            "tool_call_id": event.tool_call_id,
                        },
                    )
    
    except Exception as e:
        logger.error(f"Streaming error: {e}", exc_info=True)
        yield format_sse(event="error", content=str(e))
    finally:
        yield "event: Done\ndata: {}\n\n"

# Routes
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
