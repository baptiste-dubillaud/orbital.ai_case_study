"use client";

import { useRef, useEffect, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { useChatContext } from "@/context/ChatContext";
import styles from "@/styles/components/ChatInput.module.css";

export default function ChatInput() {
  const { input, setInput, handleSend, isLoading, hasMessages } =
    useChatContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }
  }, [input]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <motion.div
      className={styles.wrapper}
      layout
      initial={false}
      animate={{ y: 0 }}
      style={{
        position: hasMessages ? "sticky" : "absolute",
        bottom: hasMessages ? 0 : "auto",
        top: hasMessages ? "auto" : "50%",
        transform: hasMessages ? "none" : "translateY(-50%)",
      }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
    >
      {!hasMessages && (
        <motion.h1
          className={styles.title}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          What can I help you with?
        </motion.h1>
      )}

      <div className={styles.container}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message..."
          rows={1}
          disabled={isLoading}
        />
        <button
          className={styles.sendButton}
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          aria-label="Send message"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}
