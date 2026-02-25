"use client";

import { motion } from "framer-motion";
import { useChatContext } from "@/context/ChatContext";
import MarkdownRenderer from "./MarkdownRenderer";
import styles from "@/styles/components/LLMGeneration.module.css";

export default function LLMGeneration() {
  const { streamingContent, isLoading, isThinking, liveToolCall } =
    useChatContext();

  if (!streamingContent && !isLoading) return null;

  return (
    <>
      {/* Streaming markdown content */}
      {streamingContent && (
        <motion.div
          className={styles.bubble}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <MarkdownRenderer content={streamingContent} />
        </motion.div>
      )}

      {/* Typing dots (before any content arrives) */}
      {isLoading && !streamingContent && !isThinking && !liveToolCall && (
        <motion.div
          className={styles.typingIndicator}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </motion.div>
      )}
    </>
  );
}
