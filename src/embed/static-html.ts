import { rgbHex } from "../colour/space.ts";
import type { Art, ArtCfg, CellColour } from "../types.ts";

const esc = (value: string): string => value.replace(/[&<>"']/gu, char => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
})[char] ?? char);

const fonts = `"Apple Braille","Noto Sans Symbols 2","DejaVu Sans Mono","Segoe UI Symbol",monospace`;

const colourStyle = (colour?: CellColour): string => {
  if (!colour) return "";
  return [colour.fg ? `color:${rgbHex(colour.fg)}` : "", colour.bg ? `background:${rgbHex(colour.bg)}` : ""]
    .filter(Boolean)
    .join(";");
};

const rowsWithColour = (art: Art, fallbackCell: number, cellH: string, fontSize: string): string => {
  const lines = art.text.split("\n");
  let at = 0;
  return lines.map(line => {
    const chars = [...line.padEnd(art.columns, "⠀")];
    const runs: string[] = [];
    let start = 0;
    while (start < chars.length) {
      const style = colourStyle(art.cellColours?.[at + start]);
      let end = start + 1;
      while (end < chars.length && colourStyle(art.cellColours?.[at + end]) === style) end += 1;
      const count = end - start;
      const text = esc(chars.slice(start, end).join(""));
      const fallbackWidth = `${(count * fallbackCell).toFixed(4)}px`;
      const width = `${(count * 100 / art.columns).toFixed(8)}cqw`;
      const fallbackHeight = `${(fallbackCell * 2).toFixed(4)}px`;
      runs.push(`<span style="display:inline-block;width:${fallbackWidth};width:${width};height:${fallbackHeight};height:${cellH};line-height:${fallbackHeight};line-height:${cellH};font-size:${fontSize};white-space:pre;overflow:visible;vertical-align:top;${style}">${text}</span>`);
      start = end;
    }
    at += art.columns;
    const fallbackHeight = `${(fallbackCell * 2).toFixed(4)}px`;
    return `<div style="width:${(art.columns * fallbackCell).toFixed(4)}px;width:100cqw;height:${fallbackHeight};height:${cellH};line-height:${fallbackHeight};line-height:${cellH};white-space:nowrap;overflow:visible">${runs.join("")}</div>`;
  }).join("");
};

/**
 * A deliberately verbose embed fragment with no script, link, fetch or runtime dependency.
 * Container-query units make it responsive where supported; px fallbacks keep it usable in
 * older browsers. Exact font metrics cannot be measured without JavaScript, so this mode
 * favours portability over the compact runtime's pixel-perfect cell calibration.
 */
export const staticArtHtml = (art: Art, cfg: ArtCfg = {}): string => {
  const columns = Math.max(1, art.columns);
  const fallbackCell = 640 / columns;
  const cellH = `${(200 / columns).toFixed(8)}cqw`;
  const fontSize = `${(160 / columns).toFixed(8)}cqw`;
  const foregroundOnly = cfg.colour === true && cfg.fullColour !== true;
  const surface = foregroundOnly ? "background:#24212b;color:#f4eff5" : "background:Canvas;color:CanvasText;color-scheme:light dark";
  const outer = `display:block;width:min(100%,40rem);container-type:inline-size;overflow:auto;${surface}`;
  const common = `margin:0;font-family:${fonts};font-weight:400;font-synthesis:none;font-variant-ligatures:none;letter-spacing:0;text-rendering:geometricPrecision`;

  if (!art.cellColours) {
    const fallbackFont = `${(fallbackCell * 1.6).toFixed(4)}px`;
    const fallbackLine = `${(fallbackCell * 2).toFixed(4)}px`;
    return `<div role="img" aria-label="Generated Unicode art" style="${outer}"><pre style="${common};font-size:${fallbackFont};font-size:${fontSize};line-height:${fallbackLine};line-height:${cellH};white-space:pre;overflow:visible">${esc(art.text)}</pre></div>`;
  }

  const fallbackGrid = `font-size:${(fallbackCell * 1.6).toFixed(4)}px;line-height:${(fallbackCell * 2).toFixed(4)}px`;
  return `<div role="img" aria-label="Generated Unicode art" style="${outer}"><div style="${common};${fallbackGrid};font-size:${fontSize};line-height:${cellH};width:${(columns * fallbackCell).toFixed(4)}px;width:100cqw;overflow:visible">${rowsWithColour(art, fallbackCell, cellH, fontSize)}</div></div>`;
};
