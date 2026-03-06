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

_OPEN_TAG = "<thinking>"
_CLOSE_TAG = "</thinking>"


class ThinkingTagParser:
    """Strip ``<thinking>`` tags from streamed text and label each piece.

    Models without native thinking support embed reasoning inside
    ``<thinking>…</thinking>`` XML tags in the content stream.  This
    parser splits those out so the frontend receives proper "thinking"
    vs "content" events.

    Usage:

        parser = ThinkingTagParser()

        for chunk in stream:
            for event_type, text in parser.feed(chunk):
                emit(event_type, text)   # "thinking" or "content"

        for event_type, text in parser.flush():
            emit(event_type, text)
    """

    def __init__(self) -> None:
        self._buf = ""
        self._inside = False  # True while between <thinking> and </thinking>

    def feed(self, chunk: str) -> list[tuple[str, str]]:
        """Accept new text and return any resolved (event_type, text) pairs."""
        self._buf += chunk
        return self._consume_tags()

    def flush(self) -> list[tuple[str, str]]:
        """Emit whatever is left in the buffer (end of stream)."""
        if not self._buf:
            return []
        leftover = [(self._current_event, self._buf)]
        self._buf = ""
        return leftover

    @property
    def _current_event(self) -> str:
        """The SSE event type for text at the current position."""
        return "thinking" if self._inside else "content"

    @property
    def _next_tag(self) -> str:
        """The tag we're waiting for next."""
        return _CLOSE_TAG if self._inside else _OPEN_TAG

    def _consume_tags(self) -> list[tuple[str, str]]:
        """Extract all complete tag transitions from the buffer."""
        results: list[tuple[str, str]] = []

        while (idx := self._buf.find(self._next_tag)) != -1:
            # Everything before the tag belongs to the current state.
            before = self._buf[:idx]
            if before:
                results.append((self._current_event, before))

            # Skip past the tag and flip state.
            self._buf = self._buf[idx + len(self._next_tag) :]
            self._inside = not self._inside

        # Emit remaining safe text, but hold back a trailing partial tag
        # (e.g. "<thi" could be the start of "<thinking>").
        if self._buf:
            last_lt = self._buf.rfind("<")
            is_partial_tag = (
                last_lt != -1
                and self._next_tag.startswith(self._buf[last_lt:])
            )

            if is_partial_tag:
                safe = self._buf[:last_lt]
                if safe:
                    results.append((self._current_event, safe))
                self._buf = self._buf[last_lt:]
            else:
                results.append((self._current_event, self._buf))
                self._buf = ""

        return results

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

    tag_parser = ThinkingTagParser()

    try:
        async for ev in agent.run_stream_events(
            prompt,
            deps=ctx,
            message_history=history or None,
        ):
            if isinstance(ev, PartStartEvent):
                if isinstance(ev.part, TextPart) and ev.part.content:
                    for event_type, text in tag_parser.feed(ev.part.content):
                        yield sse_text(event_type, text)
                elif isinstance(ev.part, ThinkingPart) and ev.part.content:
                    yield sse_text("thinking", ev.part.content)

            elif isinstance(ev, PartDeltaEvent):
                if isinstance(ev.delta, TextPartDelta):
                    for event_type, text in tag_parser.feed(ev.delta.content_delta):
                        yield sse_text(event_type, text)
                elif isinstance(ev.delta, ThinkingPartDelta):
                    yield sse_text("thinking", ev.delta.content_delta)

            elif isinstance(ev, FunctionToolCallEvent):
                # Flush any buffered tag chars before a tool call.
                for event_type, text in tag_parser.flush():
                    yield sse_text(event_type, text)
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

        # Flush remaining buffer at end of stream.
        for event_type, text in tag_parser.flush():
            yield sse_text(event_type, text)

    except Exception as exc:
        log.error("Streaming error: %s", exc, exc_info=True)
        yield sse_text("error", str(exc))
    finally:
        yield "event: Done\ndata: {}\n\n"
