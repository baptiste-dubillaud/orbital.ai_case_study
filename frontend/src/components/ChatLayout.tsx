"use client";

import { useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatContext } from "@/context/ChatContext";
import ChatBubble from "./ChatBubble";
import ChatInput from "./ChatInput";
import Sidebar from "./Sidebar";
import { ChatMessage } from "@/lib/types";
import styles from "@/styles/components/ChatLayout.module.css";

export default function ChatLayout() {
  const {
    messages,
    hasMessages,
    isLoading,
    streamingContent,
    liveReasoning,
    livePlotFiles,
  } = useChatContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /*
   * During streaming, append a virtual assistant message built from live state.
   * When streaming finishes, React batches the state updates (messages gains
   * the real assistant message + isLoading becomes false) in a single render,
   * so the ChatBubble at the same key just updates its props — no remount,
   * no flash.
   */
  const displayMessages = useMemo<ChatMessage[]>(() => {
    if (!isLoading) return messages;

    const virtualMsg: ChatMessage = {
      role: "assistant",
      content: streamingContent,
      ...(liveReasoning.length > 0 && { reasoning: liveReasoning }),
      ...(livePlotFiles.length > 0 && { plotFiles: livePlotFiles }),
    };
    return [...messages, virtualMsg];
  }, [messages, isLoading, streamingContent, liveReasoning, livePlotFiles]);

  const streamingIndex = isLoading ? displayMessages.length - 1 : -1;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages]);

  return (
    <div className={styles.outerWrapper}>
      <Sidebar />

      <div className={styles.container}>
        {/* Messages area */}
        <AnimatePresence>
          {hasMessages && (
            <motion.div
              className={styles.messagesArea}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.messagesList}>
                {displayMessages.map((msg, i) => (
                  <ChatBubble
                    key={i}
                    message={msg}
                    index={i}
                    streaming={i === streamingIndex}
                  />
                ))}

                <div ref={messagesEndRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <ChatInput />
      </div>
    </div>
  );
}
