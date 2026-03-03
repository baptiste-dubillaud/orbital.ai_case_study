"use client";

import { memo, useCallback } from "react";
import { useChatContext } from "@/context/ChatContext";
import { useDatasetContext } from "@/context/DatasetContext";
import styles from "@/styles/components/DatasetCards.module.css";

function DatasetCards() {
  const { datasets } = useDatasetContext();
  const { hasMessages, handleSend } = useChatContext();

  const onCardClick = useCallback(
    (name: string) => {
      handleSend(`Give me basic statistics on this dataset: ${name}`);
    },
    [handleSend]
  );

  if (hasMessages || datasets.length === 0) return null;

  return (
    <div className={styles.container}>
      <p className={styles.subtitle}>Available datasets</p>
      <div className={styles.grid}>
        {datasets.map((ds) => (
          <button
            key={ds.name}
            className={styles.card}
            onClick={() => onCardClick(ds.name)}
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
          </button>
        ))}
      </div>
    </div>
  );
}

export default memo(DatasetCards);
