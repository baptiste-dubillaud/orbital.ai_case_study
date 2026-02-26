"use client";

import { useChatContext } from "@/context/ChatContext";
import styles from "@/styles/components/Sidebar.module.css";

export default function Sidebar() {
  const {
    conversations,
    activeConversationId,
    switchConversation,
    startNewChat,
    removeConversation,
  } = useChatContext();

  return (
    <aside className={styles.sidebar}>
      {/* New chat button */}
      <button className={styles.newChatBtn} onClick={startNewChat}>
        <span className={styles.plusIcon}>+</span>
        New Chat
      </button>

      {/* Conversation list — only show conversations that have messages */}
      <nav className={styles.list}>
        {conversations
          .filter((conv) => conv.messages.length > 0 || conv.id === activeConversationId)
          .filter((conv) => conv.messages.length > 0)
          .map((conv) => (
          <div
            key={conv.id}
            className={`${styles.item} ${
              conv.id === activeConversationId ? styles.active : ""
            }`}
            onClick={() => switchConversation(conv.id)}
          >
              <span className={styles.itemLabel} title={conv.title || conv.id}>
                {conv.title || conv.id}
              </span>
              <button
                className={styles.deleteBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  removeConversation(conv.id);
                }}
                aria-label="Delete conversation"
              >
                ×
              </button>
            </div>
          ))}
      </nav>
    </aside>
  );
}
