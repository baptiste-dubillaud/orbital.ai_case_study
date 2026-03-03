"use client";

import { memo, useMemo } from "react";
import { useConversationContext } from "@/context/ConversationContext";
import { useThemeContext } from "@/context/ThemeContext";
import { Conversation } from "@/lib/types";
import styles from "@/styles/components/Sidebar.module.css";

/*  Period grouping  */

interface PeriodGroup {
  label: string;
  conversations: Conversation[];
}

function groupByPeriod(conversations: Conversation[]): PeriodGroup[] {
  const ms_per_day = 1000 * 60 * 60 * 24;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - ms_per_day;
  const startOfLast7 = startOfToday - 7 * ms_per_day;
  const startOfLast30 = startOfToday - 30 * ms_per_day;

  const history: Record<string, Conversation[]> = {
    Today: [],
    Yesterday: [],
    "Last 7 days": [],
    "Last 30 days": [],
    Older: [],
  };

  for (const conv of conversations) {
    const t = conv.createdAt;
    if (t >= startOfToday) history["Today"].push(conv);
    else if (t >= startOfYesterday) history["Yesterday"].push(conv);
    else if (t >= startOfLast7) history["Last 7 days"].push(conv);
    else if (t >= startOfLast30) history["Last 30 days"].push(conv);
    else history["Older"].push(conv);
  }

  return Object.entries(history)
    .filter(([, list]) => list.length > 0)
    .map(([label, list]) => ({ label, conversations: list }));
}

/*  Component  */

function Sidebar() {
  const {
    conversations,
    activeConversationId,
    switchConversation,
    startNewChat,
    removeConversation,
    isLocked,
  } = useConversationContext();

  const { theme, toggleTheme } = useThemeContext();

  const visibleConversations = useMemo(
    () => conversations.filter((c) => c.messages.length > 0),
    [conversations],
  );

  const groups = useMemo(
    () => groupByPeriod(visibleConversations),
    [visibleConversations],
  );

  return (
    <aside
      className={`${styles.sidebar} ${isLocked ? styles.locked : ""}`}
      aria-label="Conversation history"
    >
      {/* New chat button */}
      <button
        className={styles.newChatBtn}
        onClick={startNewChat}
        disabled={isLocked}
      >
        <span className={styles.plusIcon}>+</span>
        New Chat
      </button>

      {/* Divider */}
      <div className={styles.divider} />

      {/* Conversation list grouped by period */}
      <nav className={styles.list} aria-label="Chat list">
        {groups.map((group) => (
          <div key={group.label} className={styles.periodGroup}>
            <span className={styles.periodLabel}>{group.label}</span>
            {group.conversations.map((conv) => (
              <button
                key={conv.id}
                className={`${styles.item} ${
                  conv.id === activeConversationId ? styles.active : ""
                }`}
                onClick={() => switchConversation(conv.id)}
                disabled={isLocked}
              >
                <span className={styles.itemLabel} title={conv.title || conv.id}>
                  {conv.title || conv.id}
                </span>
                <span
                  role="button"
                  className={styles.deleteBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isLocked) removeConversation(conv.id);
                  }}
                  aria-label={`Delete conversation ${conv.title || conv.id}`}
                >
                  ×
                </span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Theme toggle */}
      <div className={styles.divider} />
      <button
        className={styles.themeToggle}
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? (
          /* Sun icon */
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          /* Moon icon */
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
        <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
      </button>
    </aside>
  );
}

export default memo(Sidebar);
