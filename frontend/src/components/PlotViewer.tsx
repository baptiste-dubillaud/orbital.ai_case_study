"use client";

import { memo, useState, useCallback } from "react";
import { API_BASE } from "@/lib/api";
import styles from "@/styles/components/PlotViewer.module.css";

interface PlotViewerProps {
  files: string[];
}

function PlotFrame({ file }: { file: string }) {
  const [loaded, setLoaded] = useState(false);
  const handleLoad = useCallback(() => setLoaded(true), []);

  return (
    <div className={styles.plotWrapper}>
      {!loaded && (
        <div className={styles.loaderOverlay}>
          <span className={styles.spinner} />
        </div>
      )}
      <iframe
        src={`${API_BASE}/api/v1/output/${encodeURIComponent(file)}`}
        className={`${styles.iframe} ${loaded ? styles.iframeVisible : styles.iframeHidden}`}
        sandbox="allow-scripts"
        title={file.replace(/[_-]/g, " ").replace(/\.html$/, "")}
        onLoad={handleLoad}
      />
    </div>
  );
}

function PlotViewer({ files }: PlotViewerProps) {
  if (files.length === 0) return null;

  return (
    <div className={styles.container}>
      {files.map((file) => (
        <PlotFrame key={file} file={file} />
      ))}
    </div>
  );
}

export default memo(PlotViewer);
