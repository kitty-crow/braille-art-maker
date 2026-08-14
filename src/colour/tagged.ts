import type { Art, Rgb } from "../types.ts";
import { rgbHex } from "./space.ts";

const eq = (a?: Rgb, b?: Rgb): boolean => (!a && !b) || (!!a && !!b && a.r === b.r && a.g === b.g && a.b === b.b);
const tag = (rgb: Rgb | undefined, background: boolean): string => `<${background ? "@" : ""}${rgb ? rgbHex(rgb) : "#default"}>`;

export const taggedText = (art: Art): string => {
  if (!art.cellColours?.length) return art.text;
  const lines = art.text.split("\n");
  const out: string[] = [];
  for (let y = 0; y < lines.length; y += 1) {
    let fg: Rgb | undefined, bg: Rgb | undefined, used = false;
    const chars = [...(lines[y] ?? "").padEnd(art.columns, "⠀")];
    let line = "";
    for (let x = 0; x < art.columns; x += 1) {
      const colour = art.cellColours[y * art.columns + x];
      const nextFg = colour?.fg, nextBg = colour?.bg;
      if (!eq(fg, nextFg)) { line += tag(nextFg, false); fg = nextFg; used = true; }
      if (!eq(bg, nextBg)) { line += tag(nextBg, true); bg = nextBg; used = true; }
      line += chars[x] ?? "⠀";
    }
    if (used) line += "<#default><@#default>";
    out.push(line);
  }
  return out.join("\n");
};

interface Tag { readonly background: boolean; readonly reset: boolean; readonly rgb?: Rgb; readonly length: number; }

const hex = (text: string): Rgb | undefined => {
  const raw = text.startsWith("#") ? text.slice(1) : text;
  if (/^[0-9a-fA-F]{3}$/.test(raw)) return { r: Number.parseInt(raw[0]! + raw[0]!, 16), g: Number.parseInt(raw[1]! + raw[1]!, 16), b: Number.parseInt(raw[2]! + raw[2]!, 16) };
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return { r: Number.parseInt(raw.slice(0, 2), 16), g: Number.parseInt(raw.slice(2, 4), 16), b: Number.parseInt(raw.slice(4, 6), 16) };
  return undefined;
};

const parseTag = (source: string, aliases: ReadonlyMap<string, Rgb>): Tag | undefined => {
  if (!source.startsWith("<")) return undefined;
  const end = source.indexOf(">"); if (end < 0) return undefined;
  let body = source.slice(1, end), background = false;
  if (body.startsWith("@")) { background = true; body = body.slice(1); }
  if (body.toLowerCase() === "#default" || body.toLowerCase() === "default") return { background, reset: true, length: end + 1 };
  const rgb = body.startsWith("#") ? hex(body) : aliases.get(body);
  return rgb ? { background, reset: false, rgb, length: end + 1 } : undefined;
};

export const taggedToAnsi = (source: string): string => {
  const aliases = new Map<string, Rgb>();
  const body: string[] = [];
  for (const line of source.split("\n")) {
    const m = line.match(/^\s*#define\s+([A-Za-z0-9_-]+)\s*=\s*(#[0-9A-Fa-f]{3}(?:[0-9A-Fa-f]{3})?)\s*;\s*$/);
    if (m) { const rgb = hex(m[2]!); if (rgb) aliases.set(m[1]!, rgb); continue; }
    body.push(line);
  }
  const text = body.join("\n");
  let out = "", saw = false;
  for (let i = 0; i < text.length;) {
    const parsed = parseTag(text.slice(i), aliases);
    if (!parsed) { out += text[i] ?? ""; i += 1; continue; }
    saw = true;
    if (parsed.reset) out += `\x1b[${parsed.background ? 49 : 39}m`;
    else if (parsed.rgb) out += `\x1b[${parsed.background ? 48 : 38};2;${parsed.rgb.r};${parsed.rgb.g};${parsed.rgb.b}m`;
    i += parsed.length;
  }
  return saw ? `${out}\x1b[39m\x1b[49m` : out;
};
