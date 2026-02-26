import logging
from collections.abc import AsyncGenerator

from pydantic_ai.messages import (
    TextPart,
    ThinkingPart,
    TextPartDelta,
    ThinkingPartDelta,
    PartStartEvent,
    PartDeltaEvent,
    FunctionToolCallEvent,
    FunctionToolResultEvent,
    ToolReturnPart,
)

from api.models import ChatRequest, MessagePayload
from api.models.streaming import sse, sse_text
from agent.agent import get_agent
from agent.context import AgentContext
from data.loader import get_datasets, get_dataset_info_str
from services.history import build_history

log = logging.getLogger(__name__)


async def stream_chat(request: ChatRequest) -> AsyncGenerator[str, None]:
    """Run the agent on *request* and yield SSE frames as they arrive.

    Event types emitted:
      - ``content``      – assistant text chunk
      - ``thinking``     – reasoning/thinking chunk
      - ``tool_call``    – tool invocation (name, args, id)
      - ``tool_result``  – tool return value
      - ``error``        – if something blows up
      - ``Done``         – final sentinel, always sent
    """
    agent = get_agent()
    ctx = AgentContext(datasets=get_datasets(), dataset_info=get_dataset_info_str())

    history = build_history(request.messages[:-1])
    prompt = request.messages[-1].content

    log.info("Chat – prompt: %s | history: %d msgs", prompt, len(history))

    try:
        async for ev in agent.run_stream_events(
            prompt,
            deps=ctx,
            message_history=history or None,
        ):
            if isinstance(ev, PartStartEvent):
                if isinstance(ev.part, TextPart) and ev.part.content:
                    yield sse_text("content", ev.part.content)
                elif isinstance(ev.part, ThinkingPart) and ev.part.content:
                    yield sse_text("thinking", ev.part.content)

            elif isinstance(ev, PartDeltaEvent):
                if isinstance(ev.delta, TextPartDelta):
                    yield sse_text("content", ev.delta.content_delta)
                elif isinstance(ev.delta, ThinkingPartDelta):
                    yield sse_text("thinking", ev.delta.content_delta)

            elif isinstance(ev, FunctionToolCallEvent):
                yield sse("tool_call", {
                    "tool_name": ev.part.tool_name,
                    "args": ev.part.args,
                    "tool_call_id": ev.part.tool_call_id,
                })

            elif isinstance(ev, FunctionToolResultEvent) and isinstance(ev.result, ToolReturnPart):
                yield sse("tool_result", {
                    "result": ev.result.content,
                    "tool_call_id": ev.tool_call_id,
                })

    except Exception as exc:
        log.error("Streaming error: %s", exc, exc_info=True)
        yield sse_text("error", str(exc))
    finally:
        yield "event: Done\ndata: {}\n\n"
