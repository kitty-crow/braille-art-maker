import { rgbHex } from "../colour/space.ts";
import type { PackedEmbed } from "./codec.ts";
import type { Art, ArtCfg, CellColour, Rgb } from "../types.ts";

const esc = (value: string): string => value.replace(/[&<>"']/gu, char => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
})[char] ?? char);

const fonts = `"Apple Braille","Noto Sans Symbols 2","DejaVu Sans Mono","Segoe UI Symbol",monospace`;
const sameRgb = (a?: Rgb, b?: Rgb): boolean => (!a && !b) || (!!a && !!b && a.r === b.r && a.g === b.g && a.b === b.b);
const pct = (index: number, columns: number): string => `${Number((index * 100 / columns).toFixed(6))}%`;

const gradient = (
  colours: readonly CellColour[] | undefined,
  offset: number,
  columns: number,
  background: boolean,
  fallback: string,
): string | null => {
  if (!colours || columns < 1) return null;
  const rgbAt = (x: number): Rgb | undefined => background ? colours[offset + x]?.bg : colours[offset + x]?.fg;
  let explicit = false;
  const stops: string[] = [];
  let start = 0;
  while (start < columns) {
    const rgb = rgbAt(start);
    if (rgb) explicit = true;
    let end = start + 1;
    while (end < columns && sameRgb(rgb, rgbAt(end))) end += 1;
    const colour = rgb ? rgbHex(rgb) : fallback;
    stops.push(`${colour} ${pct(start, columns)}`, `${colour} ${pct(end, columns)}`);
    start = end;
  }
  return explicit ? `linear-gradient(to right,${stops.join(",")})` : null;
};

const rowTextFromMasks = (masks: Uint8Array, columns: number, y: number): string => {
  let text = "";
  const offset = y * columns;
  for (let x = 0; x < columns; x += 1) text += String.fromCodePoint(0x2800 + (masks[offset + x] ?? 0));
  return text;
};

const artMasks = (art: Art): Uint8Array => {
  const out = new Uint8Array(art.columns * art.rows);
  const lines = art.text.split("\n");
  for (let y = 0; y < art.rows; y += 1) {
    const line = [...(lines[y] ?? "").padEnd(art.columns, "⠀")];
    for (let x = 0; x < art.columns; x += 1) out[y * art.columns + x] = Math.max(0, (line[x]?.codePointAt(0) ?? 0x2800) - 0x2800) & 0xff;
  }
  return out;
};

interface StaticData {
  readonly columns: number;
  readonly rows: number;
  readonly masks: Uint8Array;
  readonly colour: boolean;
  readonly fullColour: boolean;
  readonly cellColours?: readonly CellColour[];
}

const dataFromPacked = (packed: PackedEmbed): StaticData => ({
  columns: packed.columns,
  rows: packed.rows,
  masks: packed.masks,
  colour: packed.colour,
  fullColour: packed.fullColour,
  ...(packed.cellColours ? { cellColours: packed.cellColours } : {}),
});

function* staticChunks(data: StaticData): Generator<string> {
  const columns = Math.max(1, data.columns);
  const rows = Math.max(1, data.rows);
  const fitCells = Math.max(columns, rows * 2);
  const fallbackCell = 640 / fitCells;
  const cellH = `${(200 / fitCells).toFixed(8)}cqw`;
  const fontSize = `${(160 / fitCells).toFixed(8)}cqw`;
  const fallbackFont = `${(fallbackCell * 1.6).toFixed(4)}px`;
  const fallbackLine = `${(fallbackCell * 2).toFixed(4)}px`;
  const gridWidth = `${(columns * 100 / fitCells).toFixed(8)}cqw`;
  const foregroundOnly = data.colour && !data.fullColour;
  const surfaceBg = foregroundOnly ? "#24212b" : "Canvas";
  const surfaceFg = foregroundOnly ? "#f4eff5" : "CanvasText";
  const colourScheme = foregroundOnly ? "" : ";color-scheme:light dark";
  const outer = `display:grid;place-items:center;width:min(100%,40rem);aspect-ratio:1;container-type:inline-size;overflow:hidden;background:${surfaceBg};color:${surfaceFg}${colourScheme}`;
  const common = `font-family:${fonts};font-weight:400;font-synthesis:none;font-variant-ligatures:none;letter-spacing:0;text-rendering:geometricPrecision`;
  const rowStyle = `display:block;width:${(columns * fallbackCell).toFixed(4)}px;width:${gridWidth};height:${fallbackLine};height:${cellH};line-height:${fallbackLine};line-height:${cellH};white-space:pre;overflow:visible`;
  const inkBase = `display:block;width:100%;height:100%;font-size:${fallbackFont};font-size:${fontSize};line-height:inherit;white-space:pre;overflow:visible`;

  yield `<div role="img" aria-label="Generated Unicode art" style="${outer}">\n`;
  yield `  <div style="${common};width:${(columns * fallbackCell).toFixed(4)}px;width:${gridWidth};overflow:visible">\n`;

  for (let y = 0; y < rows; y += 1) {
    const offset = y * columns;
    const text = esc(rowTextFromMasks(data.masks, columns, y));
    if (!data.cellColours) {
      yield `    <div style="${rowStyle};font-size:${fallbackFont};font-size:${fontSize}">${text}</div>\n`;
      continue;
    }

    const bg = gradient(data.cellColours, offset, columns, true, "transparent");
    const fg = gradient(data.cellColours, offset, columns, false, surfaceFg);
    const rowBg = bg ? `;background-image:${bg};background-repeat:no-repeat;background-size:100% 100%` : "";
    if (!fg) {
      yield `    <div style="${rowStyle}${rowBg}"><span style="${inkBase}">${text}</span></div>\n`;
      continue;
    }
    const ink = `${inkBase};background-image:${fg};background-repeat:no-repeat;background-size:100% 100%;background-clip:text;-webkit-background-clip:text;color:transparent;-webkit-text-fill-color:transparent`;
    yield `    <div style="${rowStyle}${rowBg}"><span style="${ink}">${text}</span></div>\n`;
  }

  yield "  </div>\n";
  yield "</div>";
}

const staticHtml = (data: StaticData): string => [...staticChunks(data)].join("");

/** Self-contained literal Unicode art: inline CSS only, no script/link/fetch dependency. */
export const staticArtHtml = (art: Art, cfg: ArtCfg = {}): string => staticHtml({
  columns: art.columns,
  rows: art.rows,
  masks: artMasks(art),
  colour: cfg.colour === true,
  fullColour: cfg.fullColour === true,
  ...(art.cellColours ? { cellColours: art.cellColours } : {}),
});

/** Formatted chunks allow the browser to stream huge static HTML without one giant JS string. */
export const staticPackedChunks = (packed: PackedEmbed): Generator<string> => staticChunks(dataFromPacked(packed));

/** Convenience string form retained for API/tests and modest payloads. */
export const staticPackedHtml = (packed: PackedEmbed): string => staticHtml(dataFromPacked(packed));
