"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatContext } from "@/context/ChatContext";
import ChatBubble, { LiveChatBubble } from "./ChatBubble";
import ChatInput from "./ChatInput";
import styles from "@/styles/components/ChatLayout.module.css";

export default function ChatLayout() {
  const { messages, hasMessages, streamingContent, liveReasoning, livePlotFiles } =
    useChatContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, liveReasoning, livePlotFiles]);

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

              <LiveChatBubble />

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
