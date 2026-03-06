/* Dataset info */
export interface DatasetInfo {
  name: string;
  rows: number;
  columns: number;
  column_names: string[];
}

// ---------------------------------------------------------------------------
// SSE / LLM event type constants
// ---------------------------------------------------------------------------

export const SSE_EVENT = {
  THINKING: "thinking",
  CONTENT: "content",
  TOOL_CALL: "tool_call",
  TOOL_RESULT: "tool_result",
  DONE: "Done",
  ERROR: "error",
} as const;

export type SSEEventType = (typeof SSE_EVENT)[keyof typeof SSE_EVENT];

/* Reasoning items */
export type ReasoningItem =
  | { type: typeof SSE_EVENT.THINKING; content: string }
  | { type: typeof SSE_EVENT.TOOL_CALL; toolCall: ToolCall };

/* History messages */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  reasoning?: ReasoningItem[];
  plotFiles?: string[];
}

/* Conversation history */
export interface Conversation {
  id: string;
  title?: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface ToolCall {
  toolCallId: string;
  toolName: string;
  args?: Record<string, unknown>;
  result?: string;
}

/* Message request */
export interface ChatMessagesRequest {
  messages: ChatMessageRequest[];
}

export interface ChatMessageRequest {
    role: "user" | "assistant";
    content: string;
}

/* Callbacks for streaming responses */
export interface StreamCallbacks {
  onThinkingChunk: (chunk: string) => void;
  onToolCall: (toolCall: ToolCall) => void;
  onToolResult: (toolCallId: string, result: string) => void;
  onContent: (chunk: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}
