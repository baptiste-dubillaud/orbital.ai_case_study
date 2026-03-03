"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { ChatMessage } from "@/lib/types";
import { useStaleDetection } from "@/hooks";
import MarkdownRenderer from "./MarkdownRenderer";
import ReasoningStack from "./ReasoningStack";
import PlotViewer from "./PlotViewer";
import styles from "@/styles/components/ChatBubble.module.css";

interface ChatBubbleProps {
  message: ChatMessage;
  index: number;
  streaming?: boolean;
}

function ChatBubble({ message, index, streaming = false }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const hasReasoning =
    !isUser && message.reasoning && message.reasoning.length > 0;
  const hasPlots =
    !isUser && message.plotFiles && message.plotFiles.length > 0;
  const hasContent = !!message.content;

  const stale = useStaleDetection(streaming, message.reasoning, hasContent);

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
