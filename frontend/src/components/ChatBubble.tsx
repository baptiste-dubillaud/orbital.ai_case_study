"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { ChatMessage } from "@/lib/types";
import MarkdownRenderer from "./MarkdownRenderer";
import { ReasoningSection } from "./ReasoningStack";
import styles from "@/styles/components/ChatBubble.module.css";

interface ChatBubbleProps {
  message: ChatMessage;
  index: number;
}

function ChatBubble({ message, index }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const hasReasoning =
    !isUser && message.reasoning && message.reasoning.length > 0;

  return (
    <motion.div
      className={`${styles.bubble} ${isUser ? styles.userBubble : styles.assistantBubble}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.02 }}
    >
      {hasReasoning && <ReasoningSection reasoning={message.reasoning!} />}
      {isUser ? (
        <p className={styles.bubbleText}>{message.content}</p>
      ) : (
        <MarkdownRenderer content={message.content} />
      )}
    </motion.div>
  );
}

export default memo(ChatBubble);
