"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ToolCall } from "@/lib/types";
import { useChatContext } from "@/context/ChatContext";
import styles from "@/styles/components/ReasoningStack.module.css";

/* ────────────────────────────────────────────────
 * Collapsed reasoning section (finalized messages)
 * ──────────────────────────────────────────────── */

export function ReasoningSection({
  reasoning,
}: {
  reasoning: (string | ToolCall)[];
}) {
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
    <div className={styles.section}>
      <button
        className={styles.toggle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span
          className={`${styles.arrow} ${open ? styles.arrowOpen : ""}`}
        >
          ▸
        </span>
        <span className={styles.label}>{label}</span>
      </button>

      {open && (
        <div className={styles.content}>
          {reasoning.map((item, i) =>
            typeof item === "string" ? (
              <div key={i} className={styles.thinking}>
                <p className={styles.thinkingText}>{item}</p>
              </div>
            ) : (
              <div key={i} className={styles.toolEvent}>
                <details className={styles.toolResult}>
                  <summary>
                    <strong>{item.toolName}</strong>
                    {item.result ? " — result" : " — pending"}
                  </summary>
                  {item.args && (
                    <pre>{JSON.stringify(item.args, null, 2)}</pre>
                  )}
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

/* ────────────────────────────────────────────────
 * Live reasoning display (while streaming)
 * ──────────────────────────────────────────────── */

export function LiveReasoningStack() {
  const { isThinking, thinkingContent, liveToolCall } = useChatContext();

  return (
    <>
      {/* Live thinking block */}
      {isThinking && thinkingContent && (
        <motion.div
          className={styles.liveThinkingBlock}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className={styles.liveThinkingHeader}>
            <span className={styles.liveThinkingIcon}>&#x1f4ad;</span>
            <span>Thinking…</span>
          </div>
          <p className={styles.liveThinkingText}>{thinkingContent}</p>
        </motion.div>
      )}

      {/* Live tool call */}
      {liveToolCall && (
        <motion.div
          key={`tool-live-${liveToolCall.toolCallId}`}
          className={styles.liveToolBlock}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className={styles.liveToolHeader}>
            {liveToolCall.result
              ? `${liveToolCall.toolName} finished`
              : `Using ${liveToolCall.toolName}…`}
          </div>
          {liveToolCall.result && (
            <details className={styles.liveToolDetails}>
              <summary>Show result</summary>
              <pre className={styles.liveToolPre}>
                {liveToolCall.result}
              </pre>
            </details>
          )}
        </motion.div>
      )}
    </>
  );
}
