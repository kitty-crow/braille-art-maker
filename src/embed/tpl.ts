import { base85Alphabet } from "./base85.ts";
import { base91Alphabet } from "./base91.ts";
import { cjk4096Range } from "./cjk4096.ts";
import { isJapaneseCompactPayload } from "./japanese.ts";
import { j8192Alphabet } from "./j8192.ts";
import type { EmbedCodec } from "./codec.ts";
import type { EmbedCfg, EmbedTpl } from "./types.ts";

const STYLE = "display:block;width:min(100%,40rem);aspect-ratio:1";
const base85 = new Set(base85Alphabet);
const base91 = new Set(base91Alphabet);
const j8192 = new Set(j8192Alphabet);
const cjk4096 = (value: string): boolean => {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code < cjk4096Range.first || code > cjk4096Range.last) return false;
  }
  return true;
};
const charsIn = (value: string, alphabet: ReadonlySet<string>): boolean => {
  for (const char of value) if (!alphabet.has(char)) return false;
  return true;
};
const safeJapanese = (value: string): boolean => {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code === 38 || code === 60 || code === 62 || code === 10 || code === 13) return false;
  }
  return true;
};

export class Tpl {
  make(cfg: EmbedCfg, tpl: EmbedTpl): string {
    const explicitCodec = tpl.html.includes("{{CODEC}}");
    const data = this.data(cfg.data, cfg.codec);
    return this.fill(tpl.html, {
      DATA: explicitCodec ? data : this.envelope(data, cfg.codec),
      CODEC: cfg.codec,
      THEME: cfg.theme,
      SURFACE: cfg.surface,
      STYLE: this.attr(cfg.style ?? STYLE),
      LABEL: this.attr(cfg.label ?? "Embedded Unicode art"),
      LOAD_SRC: this.attr(cfg.loadSrc ?? this.peer(cfg.src, "load.js")),
    });
  }

  private envelope(value: string, codec: EmbedCodec): string {
    return `${codec.slice(1)}${value}`;
  }

  private data(value: string, codec: EmbedCodec): string {
    if (!value) throw new Error("Embed payload is empty.");
    if (codec === "u3") {
      if (!charsIn(value, base85)) throw new Error("Embed payload contains unsafe base85 data.");
      return value;
    }
    if (codec === "u4") {
      if (isJapaneseCompactPayload(value)) {
        if (!safeJapanese(value)) throw new Error("Embed payload contains unsafe Japanese compact data.");
        return value;
      }
      if (/^&[JKL][0-9ABC]/u.test(value)) {
        const body = value.slice(3);
        if (!body || !charsIn(body, j8192)) throw new Error("Embed payload contains unsafe J8192 data.");
        return value;
      }
      if (/^&[RDB][012]/u.test(value)) {
        const body = value.slice(3);
        if (!body || !cjk4096(body)) throw new Error("Embed payload contains unsafe CJK-4096 data.");
        return value;
      }
      const body = value.startsWith("&r") || value.startsWith("&d") ? value.slice(2) : value;
      if (!body || !charsIn(body, base91)) throw new Error("Embed payload contains unsafe base91 data.");
      return value;
    }
    if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error("Embed payload must be base64url data.");
    return value;
  }

  private peer(src: string, name: string): string {
    const clean = src.split("#", 1)[0]?.split("?", 1)[0] ?? src;
    const pos = clean.lastIndexOf("/");
    return `${pos < 0 ? "" : clean.slice(0, pos + 1)}${name}`;
  }

  private fill(src: string, vals: Readonly<Record<string, string>>): string {
    const parts: string[] = [];
    let at = 0;
    const token = /\{\{([A-Z_]+)\}\}/gu;
    for (const match of src.matchAll(token)) {
      const index = match.index ?? 0;
      if (index > at) parts.push(src.slice(at, index));
      parts.push(vals[match[1]!] ?? match[0]);
      at = index + match[0].length;
    }
    if (at < src.length) parts.push(src.slice(at));
    return parts.join("");
  }

  private attr(val: string): string {
    return val
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
}
