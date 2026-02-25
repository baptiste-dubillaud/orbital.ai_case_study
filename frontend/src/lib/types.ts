/* History messages */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  reasoning?: [string | ToolCall];
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
