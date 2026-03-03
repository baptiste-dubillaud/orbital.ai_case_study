"use client";

import { memo, useState, useEffect, useRef, useCallback } from "react";
import { API_BASE } from "@/lib/api";
import { useThemeContext, Theme } from "@/context/ThemeContext";
import styles from "@/styles/components/PlotViewer.module.css";

// ── Theme-dependent injection helpers ──

function headStyle(theme: Theme): string {
  const bg = theme === "dark" ? "#1a1a1a" : "#ffffff";
  return `<style>body{background:${bg};margin:0}.plotly-graph-div{visibility:hidden}</style>`;
}

function bodyScript(theme: Theme): string {
  const isDark = theme === "dark";
  const paperBg = isDark ? "#1a1a1a" : "#ffffff";
  const plotBg = isDark ? "#1e1e1e" : "#f9f9f9";
  const fontColor = isDark ? "#e0e0e0" : "#1a1a1a";
  const gridColor = isDark ? "#333" : "#ddd";
  const zeroColor = isDark ? "#444" : "#ccc";
  const tickColor = isDark ? "#ccc" : "#444";
  const legendColor = isDark ? "#ccc" : "#333";
  const colorway = isDark
    ? '["#81c995","#6dade0","#e8b4b8","#e57373","#FFA15A","#19D3F3","#FF6692","#B6E880"]'
    : '["#43a047","#1e88e5","#d4748a","#e53935","#fb8c00","#00acc1","#e91e63","#7cb342"]';

  return [
    '<script>(function(){',
    `var d={paper_bgcolor:"${paperBg}",plot_bgcolor:"${plotBg}",`,
    `font:{color:"${fontColor}",family:"system-ui,sans-serif"},`,
    `"title.font.color":"${fontColor}",`,
    `colorway:${colorway},`,
    `xaxis:{gridcolor:"${gridColor}",zerolinecolor:"${zeroColor}",tickfont:{color:"${tickColor}"},title:{font:{color:"${tickColor}"}}},`,
    `yaxis:{gridcolor:"${gridColor}",zerolinecolor:"${zeroColor}",tickfont:{color:"${tickColor}"},title:{font:{color:"${tickColor}"}}},`,
    `legend:{font:{color:"${legendColor}"}},margin:{l:60,r:30,t:50,b:50}};`,
    'function a(){var g=document.querySelector(".plotly-graph-div");',
    'if(g&&typeof Plotly!=="undefined"){',
    'var l=g.layout||{};for(var k in l){',
    `if(/^xaxis\\d/.test(k))d[k]={gridcolor:"${gridColor}",zerolinecolor:"${zeroColor}",tickfont:{color:"${tickColor}"},title:{font:{color:"${tickColor}"}}};`,
    `if(/^yaxis\\d/.test(k))d[k]={gridcolor:"${gridColor}",zerolinecolor:"${zeroColor}",tickfont:{color:"${tickColor}"},title:{font:{color:"${tickColor}"}}};`,
    '}Plotly.relayout(g,d).then(function(){g.style.visibility="visible";r()});',
    '}else{setTimeout(a,50)}}',
    /* Height reporter: sends measured height to parent on load and on resize */
    'function r(){var h=Math.max(document.body.scrollHeight,document.documentElement.scrollHeight);',
    'parent.postMessage({type:"plot-height",height:h},"*")}',
    'var ro=new ResizeObserver(function(){r()});',
    'ro.observe(document.body);',
    'if(document.readyState==="complete")a();',
    'else window.addEventListener("load",a);',
    '})();</script>',
  ].join('');
}

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
          `${API_BASE}/api/v1/output/${encodeURIComponent(file)}`
        );
        if (!res.ok) throw new Error();
        const text = await res.text();
        if (!cancelled) setRawHtml(text);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
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
