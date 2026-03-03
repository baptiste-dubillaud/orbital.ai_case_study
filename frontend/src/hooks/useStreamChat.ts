"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { streamMessage } from "@/lib/api";
import { ChatMessage, ReasoningItem } from "@/lib/types";
import {
  appendThinkingChunk,
  appendToolCall,
  mergeToolResult,
  extractPlotFile,
} from "@/lib/reasoning";

interface UseStreamChatOptions {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setIsLocked: (locked: boolean) => void;
  autoRename: (text: string) => void;
  activeConversationId: string;
}

interface UseStreamChatReturn {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  streamingContent: string;
  liveReasoning: ReasoningItem[];
  handleSend: (message?: string) => void;
  hasMessages: boolean;
}

export function useStreamChat({
  messages,
  setMessages,
  setIsLocked,
  autoRename,
  activeConversationId,
}: UseStreamChatOptions): UseStreamChatReturn {
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
                chunk,
              );
              setLiveReasoning([...reasoningRef.current]);
            },
            onToolCall: (tc) => {
              reasoningRef.current = appendToolCall(
                reasoningRef.current,
                tc,
              );
              setLiveReasoning([...reasoningRef.current]);
            },
            onToolResult: (toolCallId, toolName, result) => {
              reasoningRef.current = mergeToolResult(
                reasoningRef.current,
                toolCallId,
                toolName,
                result,
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
          controller.signal,
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
    [input, isLoading, messages, setMessages, setIsLocked, autoRename],
  );

  return {
    input,
    setInput,
    isLoading,
    streamingContent,
    liveReasoning,
    handleSend,
    hasMessages,
  };
}
