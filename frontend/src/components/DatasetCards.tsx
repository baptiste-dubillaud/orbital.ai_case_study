"use client";

import { useChatContext } from "@/context/ChatContext";
import styles from "@/styles/components/DatasetCards.module.css";

export default function DatasetCards() {
  const { datasets, hasMessages, handleSend } = useChatContext();

  if (hasMessages || datasets.length === 0) return null;

  function onCardClick(name: string) {
    handleSend(`Give me basic statistics on this dataset: ${name}`);
  }

  return (
    <div className={styles.container}>
      <p className={styles.subtitle}>Available datasets</p>
      <div className={styles.grid}>
        {datasets.map((ds) => (
          <div
            key={ds.name}
            className={styles.card}
            onClick={() => onCardClick(ds.name)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onCardClick(ds.name)}
          >
            <h3 className={styles.cardName}>{ds.name}</h3>
            <div className={styles.cardStats}>
              <span>{ds.rows.toLocaleString()} rows</span>
              <span>{ds.columns} cols</span>
            </div>
            <div className={styles.cardColumns}>
              {ds.column_names.map((col) => (
                <span key={col} className={styles.chip}>
                  {col}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
