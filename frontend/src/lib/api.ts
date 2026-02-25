export interface ToolEvent {
  kind: "call" | "result";
  tool: string;
  description?: string;
  args?: Record<string, unknown>;
  result?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  toolEvents?: ToolEvent[];
}

export interface ToolCallData {
  tool: string;
  description: string;
  args?: Record<string, unknown>;
}

export interface ToolResultData {
  tool: string;
  result: string;
}

export interface StreamCallbacks {
  onThinking: (chunk: string) => void;
  onContent: (chunk: string) => void;
  onToolCall: (data: ToolCallData) => void;
  onToolResult: (data: ToolResultData) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

// Toggle this to switch between mock and real API
const USE_MOCK = false;

// ── Mock implementation ─────────────────────────────────────

async function mockStream(
  userMessage: string,
  callbacks: StreamCallbacks
): Promise<void> {
  const thinkingText = "Let me think about this...";
  const answerText = `This is a mock response to: "${userMessage}". Connect a real LLM backend to get actual answers.`;

  // Simulate thinking chunks
  for (const char of thinkingText) {
    await delay(30);
    callbacks.onThinking(char);
  }

  await delay(300);

  // Simulate content chunks
  const words = answerText.split(" ");
  for (const word of words) {
    await delay(50);
    callbacks.onContent(word + " ");
  }

  callbacks.onDone();
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── SSE implementation ──────────────────────────────────────

// Use the backend URL directly to avoid Next.js rewrite proxy
// which buffers SSE responses instead of streaming them.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function sseStream(
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/llm/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
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
        case "ReasoningContent": {
          const parsed = JSON.parse(data);
          callbacks.onThinking(parsed.content);
          break;
        }
        case "Content": {
          const parsed = JSON.parse(data);
          callbacks.onContent(parsed.content);
          break;
        }
        case "ToolCall": {
          const parsed = JSON.parse(data);
          callbacks.onToolCall(parsed);
          break;
        }
        case "ToolResult": {
          const parsed = JSON.parse(data);
          callbacks.onToolResult(parsed);
          break;
        }
        case "Done":
          callbacks.onDone();
          return;
        case "Error": {
          const parsed = JSON.parse(data);
          callbacks.onError(parsed.content);
          return;
        }
      }

      // Yield control so React can flush the state update and re-render
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  callbacks.onDone();
}

// ── Public API ──────────────────────────────────────────────

export async function streamMessage(
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  if (USE_MOCK) {
    const lastMessage = messages[messages.length - 1];
    return mockStream(lastMessage.content, callbacks);
  }
  return sseStream(messages, callbacks, signal);
}
