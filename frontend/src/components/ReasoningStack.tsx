"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ReasoningItem } from "@/lib/types";
import styles from "@/styles/components/ReasoningStack.module.css";


// Single reasoning item renderer

function ReasoningItemView({
  item,
}: {
  item: ReasoningItem;
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
      <div className={styles.toolHeader}>
        <span className={isRunning ? styles.statusRunning : styles.statusDone}>
          {isRunning ? (
            <span className={styles.spinnerIcon} />
          ) : (
            <span className={styles.checkIcon}>✓</span>
          )}
        </span>
        <span className={styles.toolName}>{tc.toolName}</span>
        {isRunning && (
          <span className={styles.toolStatus}>running…</span>
        )}
      </div>
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
    </div>
  );
}

/* 
 * Reasoning stack content
 */

function ReasoningStackContent({ items, callingTool }: { items: ReasoningItem[]; callingTool?: boolean }) {
  return (
    <div className={styles.stack}>
      {items.map((item, i) => (
        <ReasoningItemView key={i} item={item} />
      ))}
      {callingTool && (
        <div className={styles.toolEvent}>
          <div className={styles.toolHeader}>
            <span className={styles.statusRunning}>
              <span className={styles.spinnerIcon} />
            </span>
            <span className={styles.toolName}>Calling tool…</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* 
 * Unified ReasoningStack
 *
 *  expanded = true  → stack visible (live streaming)
 *  expanded = false → collapsed behind toggle (finalized)
 *
 * When `expanded` transitions from true → false the
 * section auto-collapses.
 */

export default function ReasoningStack({
  items,
  expanded,
  callingTool,
}: {
  items: ReasoningItem[];
  expanded: boolean;
  callingTool?: boolean;
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

  const label = useMemo(() => {
    const toolNames = [
      ...new Set(
        items
          .filter(
            (item): item is Extract<ReasoningItem, { type: "tool_call" }> =>
              item.type === "tool_call"
          )
          .map((item) => item.toolCall.toolName)
      ),
    ];
    const hasThinking = items.some((item) => item.type === "thinking");
    return [
      hasThinking ? "Reasoning" : "",
      toolNames.length > 0 ? toolNames.join(", ") : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }, [items]);

  return (
    <div className={styles.section}>
      <button
        className={styles.toggle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={`${styles.arrow} ${open ? styles.arrowOpen : ""}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
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
            <ReasoningStackContent items={items} callingTool={callingTool} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
