import { Css } from "../../vendor/braille-qr/src/html/css.ts";
import type { Art, CellColour } from "../types.ts";
import { rgbHex } from "../colour/space.ts";

const escape = (value: string): string => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;", "'": "&#39;" })[char] ?? char);
const style = (colour?: CellColour): string => {
  if (!colour) return "";
  const rules = [colour.fg ? `color:${rgbHex(colour.fg)}` : "", colour.bg ? `background-color:${rgbHex(colour.bg)}` : ""].filter(Boolean).join(";");
  return rules ? ` style="${rules}"` : "";
};

export const denseHtml = (source: string | Art, title = "Braille Art", thickness = 0): string => {
  const text = typeof source === "string" ? source : source.text;
  const colours = typeof source === "string" ? undefined : source.cellColours;
  const lines = text.split("\n");
  const columns = typeof source === "string" ? Math.max(1, ...lines.map(line => [...line].length)) : source.columns;
  const rows = typeof source === "string" ? Math.max(1, lines.length) : source.rows;
  let ci = 0;
  const cells = lines.map(line => `<div class="r">${[...line.padEnd(columns, "⠀")].map(char => { const colour = colours?.[ci++]; return `<span${style(colour)}>${escape(char)}</span>`; }).join("")}</div>`).join("\n");
  const shadow = new Css().shadow(thickness);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><style>:root{--cw:1px;--ch:2px;color-scheme:light dark}html,body{margin:0;min-height:100%;background:#fff;color:#111}body{display:grid;place-items:center;padding:24px;box-sizing:border-box}.b{font-family:"Apple Braille","Noto Sans Symbols 2","DejaVu Sans Mono","Segoe UI Symbol",monospace;font-weight:400;font-synthesis:none;font-variant-ligatures:none;text-rendering:geometricPrecision;display:grid;grid-template-rows:repeat(${rows},var(--ch));width:calc(${columns} * var(--cw));height:calc(${rows} * var(--ch));line-height:var(--ch)}.r{display:grid;grid-template-columns:repeat(${columns},var(--cw));height:var(--ch)}span{display:block;width:var(--cw);height:var(--ch);line-height:var(--ch);overflow:visible;text-shadow:${shadow}}@media(prefers-color-scheme:dark){html,body{background:#111;color:#f7f7f7}}</style></head><body><div class="b" id="b">${cells}</div><script>const b=document.getElementById('b');const p=document.createElement('span');p.textContent='⣿'.repeat(200);Object.assign(p.style,{position:'absolute',visibility:'hidden',whiteSpace:'pre',letterSpacing:'0'});const s=getComputedStyle(b);p.style.fontFamily=s.fontFamily;p.style.fontSize=s.fontSize;p.style.fontWeight=s.fontWeight;document.body.appendChild(p);const w=p.getBoundingClientRect().width/200;p.remove();document.documentElement.style.setProperty('--cw',w+'px');document.documentElement.style.setProperty('--ch',(w*2)+'px');</script></body></html>`;
};
