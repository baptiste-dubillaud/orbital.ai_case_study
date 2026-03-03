"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  ReactNode,
} from "react";
import { summarizeMessage } from "@/lib/api";
import { Conversation, ChatMessage } from "@/lib/types";
import {
  getAllConversations,
  getConversation,
  saveMessages,
  deleteConversation,
  renameConversation,
} from "@/lib/storage";

interface ConversationContextValue {
  conversations: Conversation[];
  activeConversationId: string;
  switchConversation: (id: string) => void;
  startNewChat: () => void;
  removeConversation: (id: string) => void;
  /** Messages of the active conversation */
  activeMessages: ChatMessage[];
  /** Replace messages for the active conversation (used by ChatContext) */
  setActiveMessages: (msgs: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  /** Auto-rename conversation after first user message */
  autoRename: (firstMessage: string) => void;
  /** Whether a blocking operation (send) prevents navigation */
  isLocked: boolean;
  setIsLocked: (locked: boolean) => void;
}

const ConversationContext = createContext<ConversationContextValue | null>(null);

export function useConversationContext() {
  const ctx = useContext(ConversationContext);
  if (!ctx)
    throw new Error(
      "useConversationContext must be used within ConversationProvider"
    );
  return ctx;
}

function generateId(): string {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLocked, setIsLocked] = useState(false);
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

  // Persist messages whenever they change — only refresh conversation list
  // when the message count actually changes (not on every content update)
  const prevCountRef = useRef(0);
  useEffect(() => {
    if (!activeConversationId || messages.length === 0) return;
    saveMessages(activeConversationId, messages);
    if (messages.length !== prevCountRef.current) {
      prevCountRef.current = messages.length;
      setConversations(getAllConversations());
    }
  }, [messages, activeConversationId]);

  const switchConversation = useCallback(
    (id: string) => {
      if (id === activeConversationId || isLocked) return;
      const conv = getConversation(id);
      if (!conv) return;
      setActiveConversationId(id);
      setMessages(conv.messages);
    },
    [activeConversationId, isLocked]
  );

  const startNewChat = useCallback(() => {
    if (isLocked) return;
    const id = generateId();
    setActiveConversationId(id);
    setMessages([]);
  }, [isLocked]);

  const removeConversation = useCallback(
    (id: string) => {
      if (isLocked) return;
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
    },
    [activeConversationId, isLocked]
  );

  const autoRename = useCallback(
    async (firstMessage: string) => {
      try {
        const title = await summarizeMessage(firstMessage);
        renameConversation(activeIdRef.current, title);
        setConversations(getAllConversations());
      } catch {
        // Silently ignore summarization errors
      }
    },
    [] // Uses ref for activeConversationId — no stale closure
  );

  const value = useMemo<ConversationContextValue>(
    () => ({
      conversations,
      activeConversationId,
      switchConversation,
      startNewChat,
      removeConversation,
      activeMessages: messages,
      setActiveMessages: setMessages,
      autoRename,
      isLocked,
      setIsLocked,
    }),
    [
      conversations,
      activeConversationId,
      switchConversation,
      startNewChat,
      removeConversation,
      messages,
      autoRename,
      isLocked,
    ]
  );

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
}
