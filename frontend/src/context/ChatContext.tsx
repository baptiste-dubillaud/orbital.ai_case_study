"use client";

import { createContext, useContext, useMemo, ReactNode } from "react";
import { ChatMessage, ReasoningItem } from "@/lib/types";
import { useConversationContext } from "./ConversationContext";
import { useStreamChat } from "@/hooks/useStreamChat";

interface ChatContextValue {
  messages: ChatMessage[];
  isLoading: boolean;
  streamingContent: string;
  liveReasoning: ReasoningItem[];
  input: string;
  setInput: (value: string) => void;
  handleSend: (message?: string) => void;
  hasMessages: boolean;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const {
    activeConversationId,
    activeMessages: messages,
    setActiveMessages: setMessages,
    autoRename,
    setIsLocked,
  } = useConversationContext();

  const stream = useStreamChat({
    messages,
    setMessages,
    setIsLocked,
    autoRename,
    activeConversationId,
  });

  const value = useMemo<ChatContextValue>(
    () => ({
      messages,
      isLoading: stream.isLoading,
      streamingContent: stream.streamingContent,
      liveReasoning: stream.liveReasoning,
      input: stream.input,
      setInput: stream.setInput,
      handleSend: stream.handleSend,
      hasMessages: stream.hasMessages,
    }),
    [messages, stream],
  );

  return (
    <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
  );
}
