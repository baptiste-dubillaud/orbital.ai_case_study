"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { streamMessage } from "@/lib/api";
import { ChatMessage, ReasoningItem, ToolCall } from "@/lib/types";

interface ChatContextValue {
  /* ── Data ── */
  messages: ChatMessage[];

  /* ── Streaming state ── */
  isLoading: boolean;
  streamingContent: string;
  liveReasoning: ReasoningItem[];

  /* ── Input ── */
  input: string;
  setInput: (value: string) => void;
  handleSend: () => void;

  /* ── Derived ── */
  hasMessages: boolean;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
}

/* ── Helpers to build the reasoning array immutably ── */

function appendThinkingChunk(
  items: ReasoningItem[],
  chunk: string
): ReasoningItem[] {
  const last = items[items.length - 1];
  if (last?.type === "thinking") {
    // Merge into existing thinking block
    return [
      ...items.slice(0, -1),
      { type: "thinking", content: last.content + chunk },
    ];
  }
  return [...items, { type: "thinking", content: chunk }];
}

function appendToolCall(
  items: ReasoningItem[],
  tc: ToolCall
): ReasoningItem[] {
  return [...items, { type: "tool_call", toolCall: tc }];
}

function mergeToolResult(
  items: ReasoningItem[],
  toolCallId: string,
  toolName: string,
  result: string
): ReasoningItem[] {
  return items.map((item) => {
    if (
      item.type === "tool_call" &&
      item.toolCall.toolCallId === toolCallId
    ) {
      return {
        ...item,
        toolCall: {
          ...item.toolCall,
          toolName: item.toolCall.toolName || toolName,
          result,
        },
      };
    }
    return item;
  });
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [liveReasoning, setLiveReasoning] = useState<ReasoningItem[]>([]);

  const contentRef = useRef("");
  const reasoningRef = useRef<ReasoningItem[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const hasMessages =
    messages.length > 0 ||
    !!streamingContent ||
    liveReasoning.length > 0;

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    setStreamingContent("");
    setLiveReasoning([]);

    contentRef.current = "";
    reasoningRef.current = [];

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamMessage(
        {
          messages: updatedMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        },
        {
          onThinkingChunk: (chunk) => {
            reasoningRef.current = appendThinkingChunk(
              reasoningRef.current,
              chunk
            );
            setLiveReasoning([...reasoningRef.current]);
          },
          onToolCall: (tc) => {
            reasoningRef.current = appendToolCall(
              reasoningRef.current,
              tc
            );
            setLiveReasoning([...reasoningRef.current]);
          },
          onToolResult: (toolCallId, toolName, result) => {
            reasoningRef.current = mergeToolResult(
              reasoningRef.current,
              toolCallId,
              toolName,
              result
            );
            setLiveReasoning([...reasoningRef.current]);
          },
          onContent: (chunk) => {
            contentRef.current += chunk;
            setStreamingContent((prev) => prev + chunk);
          },
          onDone: () => {},
          onError: (error) => {
            contentRef.current = `Error: ${error}`;
            setStreamingContent(`Error: ${error}`);
          },
        },
        controller.signal
      );

      if (contentRef.current) {
        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: contentRef.current,
        };
        if (reasoningRef.current.length > 0) {
          assistantMsg.reasoning = reasoningRef.current;
        }
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "An error occurred. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
      setStreamingContent("");
      setLiveReasoning([]);
      abortRef.current = null;
    }
  }, [input, isLoading, messages]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        isLoading,
        streamingContent,
        liveReasoning,
        input,
        setInput,
        handleSend,
        hasMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
