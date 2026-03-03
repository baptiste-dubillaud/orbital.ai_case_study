"use client";

import { memo, useState, useEffect } from "react";
import { API_BASE } from "@/lib/api";
import styles from "@/styles/components/PlotViewer.module.css";

// ── Two-phase dark theme injection (frontend-only) ──
// Phase 1: injected into <head> — dark body + hide chart div to prevent flash
const DARK_HEAD_STYLE =
  '<style>body{background:#1a1a1a;margin:0}.plotly-graph-div{visibility:hidden}</style>';

// Phase 2: injected before </body> — Plotly.relayout to dark colors, then reveal
const DARK_BODY_SCRIPT = [
  '<script>(function(){',
  'var d={paper_bgcolor:"#1a1a1a",plot_bgcolor:"#1e1e1e",',
  'font:{color:"#e0e0e0",family:"system-ui,sans-serif"},',
  'title:{font:{color:"#e0e0e0"}},',
  'colorway:["#81c995","#6dade0","#e8b4b8","#e57373","#FFA15A","#19D3F3","#FF6692","#B6E880"],',
  'xaxis:{gridcolor:"#333",zerolinecolor:"#444",tickfont:{color:"#ccc"},title:{font:{color:"#ccc"}}},',
  'yaxis:{gridcolor:"#333",zerolinecolor:"#444",tickfont:{color:"#ccc"},title:{font:{color:"#ccc"}}},',
  'legend:{font:{color:"#ccc"}},margin:{l:60,r:30,t:50,b:50}};',
  'function a(){var g=document.querySelector(".plotly-graph-div");',
  'if(g&&typeof Plotly!=="undefined"){',
  'var l=g.layout||{};for(var k in l){',
  'if(/^xaxis\\d/.test(k))d[k]={gridcolor:"#333",zerolinecolor:"#444",tickfont:{color:"#ccc"},title:{font:{color:"#ccc"}}};',
  'if(/^yaxis\\d/.test(k))d[k]={gridcolor:"#333",zerolinecolor:"#444",tickfont:{color:"#ccc"},title:{font:{color:"#ccc"}}};',
  '}Plotly.relayout(g,d).then(function(){g.style.visibility="visible"});',
  '}else{setTimeout(a,50)}}',
  'if(document.readyState==="complete")a();',
  'else window.addEventListener("load",a);',
  '})();</script>',
].join('');

interface PlotViewerProps {
  files: string[];
}

function PlotFrame({ file }: { file: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/v1/output/${encodeURIComponent(file)}`
        );
        if (!res.ok) throw new Error();
        const text = await res.text();
        // Phase 1: inject dark CSS into <head> (immediate dark bg, hidden chart)
        let themed = text.includes("</head>")
          ? text.replace("</head>", DARK_HEAD_STYLE + "</head>")
          : DARK_HEAD_STYLE + text;
        // Phase 2: inject relayout script before </body> (applies dark, reveals)
        themed = themed.includes("</body>")
          ? themed.replace("</body>", DARK_BODY_SCRIPT + "</body>")
          : themed + DARK_BODY_SCRIPT;
        if (!cancelled) setHtml(themed);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

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
          srcDoc={html}
          className={styles.iframe}
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
