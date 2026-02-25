"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { streamMessage } from "@/lib/api";
import { ChatMessage, ToolCall } from "@/lib/types";
import ChatBubble from "./ChatBubble";
import MarkdownRenderer from "./MarkdownRenderer";
import styles from "./Chat.module.css";

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [thinkingContent, setThinkingContent] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [liveToolCall, setLiveToolCall] = useState<ToolCall | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Refs to accumulate data for the finalized message
  const contentRef = useRef("");
  const reasoningRef = useRef<(string | ToolCall)[]>([]);

  const hasMessages = messages.length > 0 || streamingContent || isThinking || liveToolCall !== null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, thinkingContent, liveToolCall]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }
  }, [input]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    setStreamingContent("");
    setThinkingContent("");
    setIsThinking(false);
    setLiveToolCall(null);

    // Reset refs
    contentRef.current = "";
    reasoningRef.current = [];

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamMessage(
        { messages: updatedMessages.map((msg) => ({ role: msg.role, content: msg.content })) },
        {
          onContent: (chunk) => {
            setIsThinking(false);
            setLiveToolCall(null);
            contentRef.current += chunk;
            setStreamingContent((prev) => prev + chunk);
          },
          onNewReasoning: (reasoning) => {
            const item = reasoning[0];
            if (typeof item === "string") {
              // Thinking content
              setIsThinking(true);
              setLiveToolCall(null);
              setThinkingContent((prev) => prev + item);
            } else {
              // ToolCall
              setIsThinking(false);
              setLiveToolCall(item);
            }
            reasoningRef.current = [...reasoningRef.current, item];
          },
          onDone: () => {
            // Will be finalized below
          },
          onError: (error) => {
            contentRef.current = `Error: ${error}`;
            setStreamingContent(`Error: ${error}`);
          },
        },
        controller.signal
      );

      if (contentRef.current) {
        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: contentRef.current,
        };
        if (reasoningRef.current.length > 0) {
          assistantMsg.reasoning = reasoningRef.current as [string | ToolCall];
        }
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "An error occurred. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
      setStreamingContent("");
      setThinkingContent("");
      setIsThinking(false);
      setLiveToolCall(null);
      abortRef.current = null;
    }
  }, [input, isLoading, messages]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className={styles.container}>
      {/* Messages area */}
      <AnimatePresence>
        {hasMessages && (
          <motion.div
            className={styles.messagesArea}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className={styles.messagesList}>
              {messages.map((msg, i) => (
                <ChatBubble key={i} message={msg} index={i} />
              ))}

              {/* Live thinking block (while streaming) */}
              {isThinking && thinkingContent && (
                <motion.div
                  className={styles.thinkingBlock}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className={styles.thinkingHeader}>
                    <span className={styles.thinkingIcon}>&#x1f4ad;</span>
                    <span>Thinking…</span>
                  </div>
                  <p className={styles.thinkingText}>{thinkingContent}</p>
                </motion.div>
              )}

              {/* Live tool event (while streaming) — show the current tool call */}
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
                      <pre className={styles.liveToolPre}>{liveToolCall.result}</pre>
                    </details>
                  )}
                </motion.div>
              )}

              {/* Streaming content */}
              {streamingContent && (
                <motion.div
                  className={`${styles.bubble} ${styles.assistantBubble}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <MarkdownRenderer content={streamingContent} />
                </motion.div>
              )}

              {/* Loading indicator (before any content arrives) */}
              {isLoading && !streamingContent && !isThinking && !liveToolCall && (
                <motion.div
                  className={styles.typingIndicator}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <span className={styles.dot} />
                  <span className={styles.dot} />
                  <span className={styles.dot} />
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <motion.div
        className={styles.inputWrapper}
        layout
        initial={false}
        animate={{
          y: hasMessages ? 0 : 0,
        }}
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
        <div className={styles.inputContainer}>
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
    </div>
  );
}
