import { Theme } from "@/context/ThemeContext";

export function headStyle(theme: Theme): string {
  const bg = theme === "dark" ? "#1a1a1a" : "#ffffff";
  return `<style>body{background:${bg};margin:0}.plotly-graph-div{visibility:hidden}</style>`;
}

export function bodyScript(theme: Theme): string {
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
    'function r(){var h=Math.max(document.body.scrollHeight,document.documentElement.scrollHeight);',
    'parent.postMessage({type:"plot-height",height:h},"*")}',
    'var ro=new ResizeObserver(function(){r()});',
    'ro.observe(document.body);',
    'if(document.readyState==="complete")a();',
    'else window.addEventListener("load",a);',
    '})();</script>',
  ].join('');
}
