/* All SSE Events received during generation */
export interface SSEEvent {
  event: string;
  data: string | object;
}

export interface SSEThinkingPartEvent extends SSEEvent {
  data: { content: string };
}

export interface SSEContentPartEvent extends SSEEvent {
  data: { content: string };
}

export interface SSEToolCallEvent extends SSEEvent {
  data: {
    toolName: string;
    toolCallId: string;
    args?: Record<string, unknown>;
  };
}

export interface SSEToolResultEvent extends SSEEvent {
  data: {
    toolCallId: string;
    result: string;
  };
}

/* History messages */
export interface ChatMessages {
  conversationId: number;
  messages: ChatMessage[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  reasoning?: [string | ToolCall];
  thinking?: string;
  toolEvents?: ToolCall[];
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
  onContent: (chunk: string) => void;
  onNewReasoning: (reasoning: [string | ToolCall]) => void;
  onDone: () => void;
  onError: (error: string) => void;
}
