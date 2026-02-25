"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatContext } from "@/context/ChatContext";
import ChatBubble from "./ChatBubble";
import { LiveReasoningStack } from "./ReasoningStack";
import LLMGeneration from "./LLMGeneration";
import ChatInput from "./ChatInput";
import styles from "@/styles/components/ChatLayout.module.css";

export default function ChatLayout() {
  const { messages, hasMessages, streamingContent, thinkingContent, liveToolCall } =
    useChatContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, thinkingContent, liveToolCall]);

  return (
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
              {messages.map((msg, i) => (
                <ChatBubble key={i} message={msg} index={i} />
              ))}

              <LiveReasoningStack />
              <LLMGeneration />

              <div ref={messagesEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <ChatInput />
    </div>
  );
}
