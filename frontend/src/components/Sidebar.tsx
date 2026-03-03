"use client";

import { memo } from "react";
import { useConversationContext } from "@/context/ConversationContext";
import styles from "@/styles/components/Sidebar.module.css";

function Sidebar() {
  const {
    conversations,
    activeConversationId,
    switchConversation,
    startNewChat,
    removeConversation,
  } = useConversationContext();

  return (
    <aside className={styles.sidebar} aria-label="Conversation history">
      {/* New chat button */}
      <button className={styles.newChatBtn} onClick={startNewChat}>
        <span className={styles.plusIcon}>+</span>
        New Chat
      </button>

      {/* Conversation list */}
      <nav className={styles.list} aria-label="Chat list">
        {conversations
          .filter((conv) => conv.messages.length > 0)
          .map((conv) => (
          <button
            key={conv.id}
            className={`${styles.item} ${
              conv.id === activeConversationId ? styles.active : ""
            }`}
            onClick={() => switchConversation(conv.id)}
          >
              <span className={styles.itemLabel} title={conv.title || conv.id}>
                {conv.title || conv.id}
              </span>
              <span
                role="button"
                className={styles.deleteBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  removeConversation(conv.id);
                }}
                aria-label={`Delete conversation ${conv.title || conv.id}`}
              >
                ×
              </span>
            </button>
          ))}
      </nav>
    </aside>
  );
}

export default memo(Sidebar);
