"use client";

import { memo, useState } from "react";
import { motion } from "framer-motion";
import { ChatMessage, ToolCall } from "@/lib/types";
import MarkdownRenderer from "./MarkdownRenderer";
import styles from "./Chat.module.css";

interface ChatBubbleProps {
  message: ChatMessage;
  index: number;
}

function ReasoningSection({ reasoning }: { reasoning: (string | ToolCall)[] }) {
  const [open, setOpen] = useState(false);

  if (!reasoning || reasoning.length === 0) return null;

  const toolNames = [
    ...new Set(
      reasoning
        .filter((item): item is ToolCall => typeof item !== "string")
        .map((tc) => tc.toolName)
    ),
  ];

  const hasThinking = reasoning.some((item) => typeof item === "string");

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
          {reasoning.map((item, i) =>
            typeof item === "string" ? (
              <div key={i} className={styles.metadataThinking}>
                <p className={styles.metadataThinkingText}>{item}</p>
              </div>
            ) : (
              <div key={i} className={styles.metadataToolEvent}>
                <details className={styles.metadataToolResult}>
                  <summary>
                    <strong>{item.toolName}</strong>
                    {item.result ? " — result" : " — pending"}
                  </summary>
                  {item.args && <pre>{JSON.stringify(item.args, null, 2)}</pre>}
                  {item.result && <pre>{item.result}</pre>}
                </details>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function ChatBubble({ message, index }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const hasReasoning = !isUser && message.reasoning && message.reasoning.length > 0;

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
