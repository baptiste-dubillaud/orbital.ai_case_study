import { ChatMessagesRequest, StreamCallbacks, ToolCall } from "./types";

// Use the backend URL directly to avoid Next.js rewrite proxy
// which buffers SSE responses instead of streaming them.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export async function streamMessage(
  messages: ChatMessagesRequest,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/llm/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
    signal,
  });

  if (!res.ok) {
    callbacks.onError(`HTTP ${res.status}: ${res.statusText}`);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError("No response body");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete SSE messages (split by double newline)
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      const lines = part.trim().split("\n");
      let event = "";
      let data = "";

      for (const line of lines) {
        if (line.startsWith("event: ")) event = line.slice(7);
        else if (line.startsWith("data: ")) data = line.slice(6);
      }

      if (!event) continue;

      switch (event) {
        case "thinking": {
          const parsed = JSON.parse(data);
          callbacks.onNewReasoning([parsed.content as string]);
          break;
        }
        case "content": {
          const parsed = JSON.parse(data);
          callbacks.onContent(parsed.content);
          break;
        }
        case "tool_call": {
          const parsed = JSON.parse(data);
          const tc: ToolCall = {
            toolCallId: parsed.tool_call_id,
            toolName: parsed.tool_name,
            args: parsed.args ? JSON.parse(parsed.args) : undefined,
          };
          callbacks.onNewReasoning([tc]);
          break;
        }
        case "tool_result": {
          const parsed = JSON.parse(data);
          const tc: ToolCall = {
            toolCallId: parsed.tool_call_id,
            toolName: parsed.tool_name ?? "",
            result: parsed.result,
          };
          callbacks.onNewReasoning([tc]);
          break;
        }
        case "Done":
          callbacks.onDone();
          return;
        case "error": {
          const parsed = JSON.parse(data);
          callbacks.onError(parsed.content);
          return;
        }
      }

      // Yield control so React can flush state updates
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  callbacks.onDone();
}
