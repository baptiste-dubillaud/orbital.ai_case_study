"use client";

import { memo, useState } from "react";
import { motion } from "framer-motion";
import { ChatMessage, ToolEvent } from "@/lib/api";
import MarkdownRenderer from "./MarkdownRenderer";
import styles from "./Chat.module.css";

interface ChatBubbleProps {
  message: ChatMessage;
  index: number;
}

function MetadataSection({
  thinking,
  toolEvents,
}: {
  thinking?: string;
  toolEvents?: ToolEvent[];
}) {
  const [open, setOpen] = useState(false);

  const hasThinking = !!thinking;
  const hasTools = toolEvents && toolEvents.length > 0;
  if (!hasThinking && !hasTools) return null;

  const toolNames = hasTools
    ? [...new Set(toolEvents.filter((e) => e.kind === "call").map((e) => e.tool))]
    : [];

  const label = [
    hasThinking ? "Reasoning" : "",
    toolNames.length > 0 ? toolNames.join(", ") : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={styles.metadataSection}>
      <button
        className={styles.metadataToggle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={`${styles.metadataArrow} ${open ? styles.metadataArrowOpen : ""}`}>
          ▸
        </span>
        <span className={styles.metadataLabel}>{label}</span>
      </button>
      {open && (
        <div className={styles.metadataContent}>
          {hasThinking && (
            <div className={styles.metadataThinking}>
              <p className={styles.metadataThinkingText}>{thinking}</p>
            </div>
          )}
          {hasTools &&
            toolEvents.map((evt, i) => (
              <div key={i} className={styles.metadataToolEvent}>
                {evt.kind === "call" ? (
                  <span>
                    <strong>{evt.tool}</strong>
                    {evt.description ? ` — ${evt.description}` : ""}
                  </span>
                ) : (
                  <details className={styles.metadataToolResult}>
                    <summary>{evt.tool} result</summary>
                    <pre>{evt.result}</pre>
                  </details>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function ChatBubble({ message, index }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const hasMetadata = !isUser && (message.thinking || message.toolEvents?.length);

  return (
    <motion.div
      className={`${styles.bubble} ${isUser ? styles.userBubble : styles.assistantBubble}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.02 }}
    >
      {hasMetadata && (
        <MetadataSection thinking={message.thinking} toolEvents={message.toolEvents} />
      )}
      {isUser ? (
        <p className={styles.bubbleText}>{message.content}</p>
      ) : (
        <MarkdownRenderer content={message.content} />
      )}
    </motion.div>
  );
}

export default memo(ChatBubble);
