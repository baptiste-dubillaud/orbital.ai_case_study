"use client";

import { memo, useState, useEffect, useRef, useCallback } from "react";
import { API_BASE } from "@/lib/api";
import { useThemeContext } from "@/context/ThemeContext";
import { headStyle, bodyScript } from "./plotTheme";
import styles from "./PlotViewer.module.css";

interface PlotViewerProps {
  files: string[];
}

function PlotFrame({ file }: { file: string }) {
  const { theme } = useThemeContext();
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);
  /* Store the raw HTML so we can re-theme without re-fetching */
  const [rawHtml, setRawHtml] = useState<string | null>(null);
  const [frameHeight, setFrameHeight] = useState(450);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  /* Listen for height messages from the iframe */
  const onMessage = useCallback(
    (e: MessageEvent) => {
      if (
        e.data?.type === "plot-height" &&
        typeof e.data.height === "number" &&
        iframeRef.current &&
        e.source === iframeRef.current.contentWindow
      ) {
        setFrameHeight(Math.max(300, e.data.height));
      }
    },
    [],
  );

  useEffect(() => {
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onMessage]);

  /* Fetch the raw HTML once */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/v1/output/${encodeURIComponent(file)}`,
        );
        if (!res.ok) throw new Error();
        const text = await res.text();
        if (!cancelled) setRawHtml(text);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  /* Apply theme injection whenever rawHtml or theme changes */
  useEffect(() => {
    if (!rawHtml) return;
    let themed = rawHtml.includes("</head>")
      ? rawHtml.replace("</head>", headStyle(theme) + "</head>")
      : headStyle(theme) + rawHtml;
    themed = themed.includes("</body>")
      ? themed.replace("</body>", bodyScript(theme) + "</body>")
      : themed + bodyScript(theme);
    setHtml(themed);
  }, [rawHtml, theme]);

  return (
    <div className={styles.plotWrapper}>
      {error ? (
        <div className={styles.errorOverlay}>Failed to load plot</div>
      ) : !html ? (
        <div className={styles.loaderOverlay}>
          <span className={styles.spinner} />
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          srcDoc={html}
          className={styles.iframe}
          style={{ height: frameHeight }}
          sandbox="allow-scripts"
          title={file.replace(/[_-]/g, " ").replace(/\.html$/, "")}
        />
      )}
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
