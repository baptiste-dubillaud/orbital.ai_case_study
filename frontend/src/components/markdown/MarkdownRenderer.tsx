"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./Markdown.module.css";
import { ReactNode } from "react";

/* Stable references — avoid re-creating on every render */
const remarkPlugins = [remarkGfm];

const markdownComponents = {
  code({ className, children, ...props }: { className?: string; children?: ReactNode; [key: string]: unknown }) {
    const match = /language-(\w+)/.exec(className || "");
    const isInline = !match && !String(children).includes("\n");

    if (isInline) {
      return (
        <code className={styles.inlineCode} {...props}>
          {children}
        </code>
      );
    }

    return (
      <div className={styles.codeBlockWrapper}>
        {match && <span className={styles.codeLanguage}>{match[1]}</span>}
        <pre className={styles.codeBlock}>
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  },
  table({ children }: { children?: ReactNode }) {
    return (
      <div className={styles.tableWrapper}>
        <table className={styles.table}>{children}</table>
      </div>
    );
  },
};

interface MarkdownRendererProps {
  content: string;
}

function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className={styles.markdown}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default memo(MarkdownRenderer);
