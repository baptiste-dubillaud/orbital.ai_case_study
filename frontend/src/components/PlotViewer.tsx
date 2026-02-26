"use client";

import { API_BASE } from "@/lib/api";
import styles from "@/styles/components/PlotViewer.module.css";

interface PlotViewerProps {
  files: string[];
}

export default function PlotViewer({ files }: PlotViewerProps) {
  if (!files || files.length === 0) return null;

  return (
    <div className={styles.container}>
      {files.map((file) => (
        <div key={file} className={styles.plotWrapper}>
          <iframe
            src={`${API_BASE}/api/v1/output/${encodeURIComponent(file)}`}
            className={styles.iframe}
            sandbox="allow-scripts allow-same-origin"
            title={file}
          />
        </div>
      ))}
    </div>
  );
}
