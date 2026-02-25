"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ReasoningItem } from "@/lib/types";
import styles from "@/styles/components/ReasoningStack.module.css";

/* ────────────────────────────────────────────────
 * Single reasoning item renderer
 * ──────────────────────────────────────────────── */

function ReasoningItemView({
  item,
  defaultOpen,
}: {
  item: ReasoningItem;
  defaultOpen?: boolean;
}) {
  if (item.type === "thinking") {
    return (
      <div className={styles.thinking}>
        <p className={styles.thinkingText}>{item.content}</p>
      </div>
    );
  }

  const tc = item.toolCall;
  const isRunning = !tc.result;

  return (
    <div className={styles.toolEvent}>
      <details className={styles.toolResult} open={defaultOpen}>
        <summary>
          <span className={styles.toolIcon}>
            {isRunning ? "..." : "Done !"}
          </span>
          <strong>{tc.toolName}</strong>
          {isRunning && (
            <span className={styles.toolStatus}> running…</span>
          )}
        </summary>
        {tc.args && (
          <div className={styles.toolSection}>
            <span className={styles.toolSectionLabel}>Args</span>
            <pre>{JSON.stringify(tc.args, null, 2)}</pre>
          </div>
        )}
        {tc.result && (
          <div className={styles.toolSection}>
            <span className={styles.toolSectionLabel}>Result</span>
            <pre>{tc.result}</pre>
          </div>
        )}
      </details>
    </div>
  );
}

/* ────────────────────────────────────────────────
 * Reasoning stack content
 * ──────────────────────────────────────────────── */

function ReasoningStackContent({ items }: { items: ReasoningItem[] }) {
  return (
    <div className={styles.stack}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return <ReasoningItemView key={i} item={item} defaultOpen={isLast} />;
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────
 * Unified ReasoningStack
 *
 *  expanded = true  → stack visible (live streaming)
 *  expanded = false → collapsed behind toggle (finalized)
 *
 * When `expanded` transitions from true → false the
 * section auto-collapses.
 * ──────────────────────────────────────────────── */

export default function ReasoningStack({
  items,
  expanded,
}: {
  items: ReasoningItem[];
  expanded: boolean;
}) {
  const [open, setOpen] = useState(expanded);

  // Auto-collapse when expanded flips from true → false
  useEffect(() => {
    if (expanded) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [expanded]);

  if (!items || items.length === 0) return null;

  const toolNames = [
    ...new Set(
      items
        .filter((item) => item.type === "tool_call")
        .map((item) =>
          item.type === "tool_call" ? item.toolCall.toolName : ""
        )
    ),
  ];

  const hasThinking = items.some((item) => item.type === "thinking");

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
        <span className={`${styles.arrow} ${open ? styles.arrowOpen : ""}`}>
          ▸
        </span>
        <span className={styles.label}>{label}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="reasoning-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <ReasoningStackContent items={items} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
