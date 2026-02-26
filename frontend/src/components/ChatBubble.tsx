"use client";

import { memo, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChatMessage } from "@/lib/types";
import { useChatContext } from "@/context/ChatContext";
import MarkdownRenderer from "./MarkdownRenderer";
import ReasoningStack from "./ReasoningStack";
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
    <>
      {hasReasoning && (
        <ReasoningStack items={message.reasoning!} expanded={false} />
      )}
      <motion.div
        className={`${styles.bubble} ${isUser ? styles.userBubble : styles.assistantBubble}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: index * 0.02 }}
      >
        {isUser ? (
          <p className={styles.bubbleText}>{message.content}</p>
        ) : (
          <MarkdownRenderer content={message.content} />
        )}
      </motion.div>
    </>
  );
}

export default memo(ChatBubble);

/* ── Live (in-progress) assistant bubble ── */

const STALE_THINKING_MS = 500;

export function LiveChatBubble() {
  const { isLoading, streamingContent, liveReasoning } = useChatContext();
  const [stale, setStale] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect when thinking stops updating but we're still waiting
  useEffect(() => {
    if (!isLoading) {
      setStale(false);
      return;
    }

    const hasThinking = liveReasoning.some((r) => r.type === "thinking");
    const hasToolCall = liveReasoning.some((r) => r.type === "tool_call");
    const hasContent = !!streamingContent;

    // Reset stale whenever a tool call or content arrives
    if (hasToolCall || hasContent) {
      setStale(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Restart the timer on every reasoning update (content grows even if length stays 1)
    setStale(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (hasThinking) {
      timerRef.current = setTimeout(() => setStale(true), STALE_THINKING_MS);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isLoading, liveReasoning, streamingContent]);

  if (!isLoading) return null;

  const hasReasoning = liveReasoning.length > 0;
  const hasContent = !!streamingContent;

  // Reasoning is expanded until the LLM content starts streaming
  const reasoningExpanded = !hasContent;

  return (
    <>
      {hasReasoning && (
        <ReasoningStack items={liveReasoning} expanded={reasoningExpanded} callingTool={stale && !hasContent} />
      )}

      {hasContent ? (
        <motion.div
          className={`${styles.bubble} ${styles.assistantBubble}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <MarkdownRenderer content={streamingContent} />
        </motion.div>
      ) : (
        !hasReasoning && !stale && (
          <div className={styles.typingIndicator}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </div>
        )
      )}
    </>
  );
}
