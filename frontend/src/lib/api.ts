import {
  ChatMessagesRequest,
  DatasetInfo,
  SSE_EVENT,
  SSEEventType,
  StreamCallbacks,
  ToolCall,
} from "./types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Backend URL – set directly to bypass Next.js rewrite proxy buffering SSE. */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

/** Default request timeout (30 s). */
const DEFAULT_TIMEOUT_MS = 30000;

// ---------------------------------------------------------------------------
// Shared fetch helpers
// ---------------------------------------------------------------------------

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Thin wrapper around `fetch` that:
 * - enforces a timeout via `AbortSignal.timeout`
 * - throws a typed `ApiError` on non-2xx responses
 */
async function apiFetch(
  path: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  let signal = init.signal;

  if (timeoutMs > 0) {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    signal = signal
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, signal });

  if (!res.ok) {
    throw new ApiError(res.status, `HTTP ${res.status}: ${res.statusText}`);
  }
  return res;
}

// ---------------------------------------------------------------------------
// REST endpoints
// ---------------------------------------------------------------------------

export async function summarizeMessage(message: string): Promise<string> {
  const res = await apiFetch("/api/v1/llm/summarize", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ message }),
  });
  const json = await res.json();
  return json.title as string;
}

export async function fetchDatasets(): Promise<DatasetInfo[]> {
  const res = await apiFetch("/api/v1/data");
  const json = await res.json();
  return json.datasets as DatasetInfo[];
}

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

interface SSEEvent {
  event: SSEEventType;
  data: string;
}

// -- Backend payload shapes (must match `sse` / `sse_text` in streaming.py) --

/** Payload for `content` and `thinking` events (`sse_text` helper). */
interface SSETextPayload {
  content: string;
}

/** Payload for `tool_call` events. `args` is an `ArgsJson` string. */
interface SSEToolCallPayload {
  tool_name: string;
  args: string;
  tool_call_id: string;
}

/** Payload for `tool_result` events (no `tool_name` — it's on the call). */
interface SSEToolResultPayload {
  result: string;
  tool_call_id: string;
}

/**
 * Parse a single SSE frame (text between double newlines) into an event +
 * data pair. Returns `null` for keep-alive / comment-only frames.
 */
function parseSSEFrame(frame: string): SSEEvent | null {
  let event = "";
  let data = "";

  for (const line of frame.trim().split("\n")) {
    if (line.startsWith("event: ")) event = line.slice(7);
    else if (line.startsWith("data: ")) data = line.slice(6);
  }

  return event ? { event: event as SSEEventType, data } : null;
}

/**
 * Safely parse `args` which may arrive as a JSON string or an object
 * (depending on backend serialisation).
 */
function parseToolArgs(
  raw: unknown,
): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  if (typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw === "string" && raw.length > 0) {
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/** Dispatch a single parsed SSE event to the appropriate callback. */
function dispatchSSEEvent(
  { event, data }: SSEEvent,
  callbacks: StreamCallbacks,
): "done" | "continue" {
  // "Done" carries an empty `{}` payload — signal completion immediately.
  if (event === SSE_EVENT.DONE) {
    callbacks.onDone();
    return "done";
  }

  try {
    switch (event) {
      case SSE_EVENT.THINKING: {
        const { content } = JSON.parse(data) as SSETextPayload;
        callbacks.onThinkingChunk(content);
        break;
      }

      case SSE_EVENT.CONTENT: {
        const { content } = JSON.parse(data) as SSETextPayload;
        callbacks.onContent(content);
        break;
      }

      case SSE_EVENT.TOOL_CALL: {
        const payload = JSON.parse(data) as SSEToolCallPayload;
        const args = parseToolArgs(payload.args);
        const toolCall: ToolCall = {
          toolCallId: payload.tool_call_id,
          toolName: payload.tool_name,
          ...(args && { args }),
        };
        callbacks.onToolCall(toolCall);
        break;
      }

      case SSE_EVENT.TOOL_RESULT: {
        const payload = JSON.parse(data) as SSEToolResultPayload;
        callbacks.onToolResult(payload.tool_call_id, payload.result);
        break;
      }

      case SSE_EVENT.ERROR: {
        const { content } = JSON.parse(data) as SSETextPayload;
        callbacks.onError(content);
        return "done";
      }
    }
  } catch (e) {
    console.error("Failed to parse SSE payload:", event, data, e);
  }

  return "continue";
}

/** Yield control back to the event-loop so React can flush state updates. */
const yieldToEventLoop = () => new Promise<void>((r) => setTimeout(r, 0));

/** Max silence between two chunks before we consider the model stalled. */
const CHUNK_TIMEOUT_MS = 60_000;

const CHUNK_TIMEOUT_MESSAGE =
  "Model took too much time to respond, try again later.";

// ---------------------------------------------------------------------------
// Streaming chat
// ---------------------------------------------------------------------------

/**
 * Stream an LLM chat response over SSE, invoking `callbacks` as events
 * arrive. Supply an `AbortSignal` via `signal` to cancel the request.
 *
 * A per-chunk idle timeout (`CHUNK_TIMEOUT_MS`) fires if no data arrives
 * for too long — this is independent of the overall request duration.
 */
export async function streamMessage(
  messages: ChatMessagesRequest,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  let res: Response;
  try {
    res = await apiFetch(
      "/api/v1/llm/chat",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(messages),
        signal,
      },
      0, // no overall timeout — idle timeout below handles stalls
    );
  } catch (err) {
    callbacks.onError(err instanceof Error ? err.message : String(err));
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError("No response body");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      // Race each read against an idle timer that resets per chunk.
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(CHUNK_TIMEOUT_MESSAGE)), CHUNK_TIMEOUT_MS),
      );

      const { done, value } = await Promise.race([reader.read(), timeout]);
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by double newlines.
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        const sseEvent = parseSSEFrame(frame);
        if (!sseEvent) continue;

        const result = dispatchSSEEvent(sseEvent, callbacks);
        if (result === "done") return;

        await yieldToEventLoop();
      }
    }
  } catch (err) {
    // Network failures, abort signals, etc.
    if ((err as DOMException)?.name !== "AbortError") {
      callbacks.onError(err instanceof Error ? err.message : String(err));
    }
    return;
  } finally {
    reader.releaseLock();
  }

  callbacks.onDone();
}
