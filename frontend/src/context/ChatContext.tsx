"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import { streamMessage } from "@/lib/api";
import { ChatMessage, ReasoningItem, ToolCall } from "@/lib/types";
import { useConversationContext } from "./ConversationContext";

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
  handleSend: (message?: string) => void;

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

function extractPlotFile(result: string): string | null {
  const match = result.match(/Saved to:\s*output\/(.+\.html)/);
  return match ? match[1] : null;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const {
    activeConversationId,
    activeMessages: messages,
    setActiveMessages: setMessages,
    autoRename,
    setIsLocked,
  } = useConversationContext();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [liveReasoning, setLiveReasoning] = useState<ReasoningItem[]>([]);

  const contentRef = useRef("");
  const reasoningRef = useRef<ReasoningItem[]>([]);
  const plotFilesRef = useRef<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);


  // Reset streaming state when switching conversations
  useEffect(() => {
    setInput("");
    setStreamingContent("");
    setLiveReasoning([]);
  }, [activeConversationId]);

  const hasMessages =
    messages.length > 0 ||
    !!streamingContent ||
    liveReasoning.length > 0;

  const handleSend = useCallback(
    async (message?: string) => {
      const trimmed = (message ?? input).trim();
      if (!trimmed || isLoading) return;

      const isFirstMessage = messages.length === 0;
      const userMessage: ChatMessage = { role: "user", content: trimmed };
      const updatedMessages = [...messages, userMessage];

      setMessages(updatedMessages);
      setInput("");
      setIsLoading(true);
      setIsLocked(true);
      setStreamingContent("");
      setLiveReasoning([]);

      contentRef.current = "";
      reasoningRef.current = [];
      plotFilesRef.current = [];

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
              const plotFile = extractPlotFile(result);
              if (plotFile) {
                plotFilesRef.current = [...plotFilesRef.current, plotFile];
              }
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
          if (plotFilesRef.current.length > 0) {
            assistantMsg.plotFiles = plotFilesRef.current;
          }
          setMessages((prev) => [...prev, assistantMsg]);
        }

        // Auto-rename conversation on first message
        if (isFirstMessage) {
          autoRename(trimmed);
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
        setIsLocked(false);
        setStreamingContent("");
        setLiveReasoning([]);
        abortRef.current = null;
      }
    },
    [input, isLoading, messages, setMessages, setIsLocked, autoRename]
  );

  const value = useMemo<ChatContextValue>(
    () => ({
      messages,
      isLoading,
      streamingContent,
      liveReasoning,
      input,
      setInput,
      handleSend,
      hasMessages,
    }),
    [
      messages,
      isLoading,
      streamingContent,
      liveReasoning,
      input,
      handleSend,
      hasMessages,
    ]
  );

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}
