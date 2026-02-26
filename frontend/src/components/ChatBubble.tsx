"use client";

import { memo, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChatMessage } from "@/lib/types";
import MarkdownRenderer from "./MarkdownRenderer";
import ReasoningStack from "./ReasoningStack";
import PlotViewer from "./PlotViewer";
import styles from "@/styles/components/ChatBubble.module.css";

interface ChatBubbleProps {
  message: ChatMessage;
  index: number;
  streaming?: boolean;
}

const STALE_THINKING_MS = 500;

function ChatBubble({ message, index, streaming = false }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const hasReasoning =
    !isUser && message.reasoning && message.reasoning.length > 0;
  const hasPlots =
    !isUser && message.plotFiles && message.plotFiles.length > 0;
  const hasContent = !!message.content;

  /* ── Stale-thinking detection (streaming only) ── */
  const [stale, setStale] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!streaming) {
      setStale(false);
      return;
    }

    const hasThinking = message.reasoning?.some((r) => r.type === "thinking");
    const hasToolCall = message.reasoning?.some((r) => r.type === "tool_call");

    if (hasToolCall || hasContent) {
      setStale(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    setStale(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (hasThinking) {
      timerRef.current = setTimeout(() => setStale(true), STALE_THINKING_MS);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [streaming, message.reasoning, hasContent]);

  /* ── Reasoning: expanded during streaming until content arrives ── */
  const reasoningExpanded = streaming && !hasContent;

  return (
    <>
      {hasReasoning && (
        <ReasoningStack
          items={message.reasoning!}
          expanded={reasoningExpanded}
          {...(streaming ? { callingTool: stale && !hasContent } : {})}
        />
      )}

      {isUser || hasContent ? (
        <motion.div
          className={`${styles.bubble} ${isUser ? styles.userBubble : styles.assistantBubble}`}
          initial={streaming ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: streaming ? 0 : index * 0.02 }}
        >
          {isUser ? (
            <p className={styles.bubbleText}>{message.content}</p>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
        </motion.div>
      ) : streaming && !hasReasoning && !stale ? (
        <div className={styles.typingIndicator}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </div>
      ) : null}

      {hasPlots && <PlotViewer files={message.plotFiles!} />}
    </>
  );
}

export default memo(ChatBubble);
