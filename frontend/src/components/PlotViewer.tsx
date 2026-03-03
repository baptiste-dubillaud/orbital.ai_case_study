"use client";

import { memo } from "react";
import { API_BASE } from "@/lib/api";
import styles from "@/styles/components/PlotViewer.module.css";

interface PlotViewerProps {
  files: string[];
}

function PlotViewer({ files }: PlotViewerProps) {
  if (files.length === 0) return null;

  return (
    <div className={styles.container}>
      {files.map((file) => (
        <div key={file} className={styles.plotWrapper}>
          <iframe
            src={`${API_BASE}/api/v1/output/${encodeURIComponent(file)}`}
            className={styles.iframe}
            sandbox="allow-scripts"
            title={file.replace(/[_-]/g, " ").replace(/\.html$/, "")}
          />
        </div>
      ))}
    </div>
  );
}

export default memo(PlotViewer);
