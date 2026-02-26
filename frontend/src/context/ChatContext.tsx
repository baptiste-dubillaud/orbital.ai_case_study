"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { streamMessage, fetchDatasets, summarizeMessage } from "@/lib/api";
import { ChatMessage, Conversation, DatasetInfo, ReasoningItem, ToolCall } from "@/lib/types";
import {
  getAllConversations,
  getConversation,
  saveMessages,
  deleteConversation,
  renameConversation,
} from "@/lib/storage";

interface ChatContextValue {
  /* ── Data ── */
  messages: ChatMessage[];
  datasets: DatasetInfo[];

  /* ── Streaming state ── */
  isLoading: boolean;
  streamingContent: string;
  liveReasoning: ReasoningItem[];
  livePlotFiles: string[];

  /* ── Input ── */
  input: string;
  setInput: (value: string) => void;
  handleSend: (message?: string) => void;

  /* ── Derived ── */
  hasMessages: boolean;

  /* ── Conversation history ── */
  conversations: Conversation[];
  activeConversationId: string;
  switchConversation: (id: string) => void;
  startNewChat: () => void;
  removeConversation: (id: string) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
}

function generateId(): string {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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

function extractPlotFile(result: string): string | null {
  const match = result.match(/Saved to:\s*output\/(.+\.html)/);
  return match ? match[1] : null;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  /* ── Conversation-level state ── */
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>("");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [liveReasoning, setLiveReasoning] = useState<ReasoningItem[]>([]);
  const [livePlotFiles, setLivePlotFiles] = useState<string[]>([]);

  const contentRef = useRef("");
  const reasoningRef = useRef<ReasoningItem[]>([]);
  const plotFilesRef = useRef<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const activeIdRef = useRef(activeConversationId);
  activeIdRef.current = activeConversationId;

  // Bootstrap: load conversations from localStorage on mount
  useEffect(() => {
    const all = getAllConversations();
    if (all.length > 0) {
      setConversations(all);
      const first = all[0];
      setActiveConversationId(first.id);
      setMessages(first.messages);
    } else {
      const id = generateId();
      setActiveConversationId(id);
      setMessages([]);
    }
  }, []);

  // Fetch dataset info on mount
  useEffect(() => {
    fetchDatasets()
      .then(setDatasets)
      .catch(() => setDatasets([]));
  }, []);

  // Persist messages whenever they change (and we have an active conversation)
  useEffect(() => {
    if (!activeConversationId || messages.length === 0) return;
    saveMessages(activeConversationId, messages);
    setConversations(getAllConversations());
  }, [messages, activeConversationId]);

  const hasMessages =
    messages.length > 0 ||
    !!streamingContent ||
    liveReasoning.length > 0;

  /* ── Conversation management ── */
  const switchConversation = useCallback(
    (id: string) => {
      if (id === activeConversationId || isLoading) return;
      const conv = getConversation(id);
      if (!conv) return;
      setActiveConversationId(id);
      setMessages(conv.messages);
      setInput("");
      setStreamingContent("");
      setLiveReasoning([]);
      setLivePlotFiles([]);
    },
    [activeConversationId, isLoading]
  );

  const startNewChat = useCallback(() => {
    if (isLoading) return;
    const id = generateId();
    setActiveConversationId(id);
    setMessages([]);
    setInput("");
    setStreamingContent("");
    setLiveReasoning([]);
    setLivePlotFiles([]);
  }, [isLoading]);

  const removeConversation = useCallback(
    (id: string) => {
      if (isLoading) return;
      deleteConversation(id);
      const remaining = getAllConversations();
      if (remaining.length === 0) {
        const newId = generateId();
        setActiveConversationId(newId);
        setConversations([]);
        setMessages([]);
      } else {
        setConversations(remaining);
        if (id === activeConversationId) {
          const next = remaining[0];
          setActiveConversationId(next.id);
          setMessages(next.messages);
        }
      }
      setInput("");
      setStreamingContent("");
      setLiveReasoning([]);
      setLivePlotFiles([]);
    },
    [activeConversationId, isLoading]
  );

  const handleSend = useCallback(async (message?: string) => {
    const trimmed = (message ?? input).trim();
    if (!trimmed || isLoading) return;

    const isFirstMessage = messages.length === 0;
    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    setStreamingContent("");
    setLiveReasoning([]);
    setLivePlotFiles([]);

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
              setLivePlotFiles([...plotFilesRef.current]);
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
        // Clear streaming state in the same synchronous block as appending
        // the finalized message so React batches them into one render
        // (prevents the response showing twice).
        setMessages((prev) => [...prev, assistantMsg]);
        setIsLoading(false);
        setStreamingContent("");
        setLiveReasoning([]);
        setLivePlotFiles([]);
      }

      // Auto-rename conversation on first message
      if (isFirstMessage) {
        try {
          const title = await summarizeMessage(trimmed);
          renameConversation(activeIdRef.current, title);
          setConversations(getAllConversations());
        } catch {
          // Silently ignore summarization errors
        }
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
      // Ensure cleanup in case contentRef was empty or an error occurred
      setIsLoading(false);
      setStreamingContent("");
      setLiveReasoning([]);
      setLivePlotFiles([]);
      abortRef.current = null;
    }
  }, [input, isLoading, messages]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        datasets,
        isLoading,
        streamingContent,
        liveReasoning,
        livePlotFiles,
        input,
        setInput,
        handleSend,
        hasMessages,
        conversations,
        activeConversationId,
        switchConversation,
        startNewChat,
        removeConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
