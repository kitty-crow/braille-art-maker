import { base85Alphabet } from "./base85.ts";
import { base91Alphabet } from "./base91.ts";
import { cjk4096Range } from "./cjk4096.ts";
import { j8192Alphabet } from "./j8192.ts";
import type { EmbedCodec } from "./codec.ts";
import type { EmbedCfg, EmbedTpl } from "./types.ts";

const STYLE = "display:block;width:min(100%,40rem);aspect-ratio:1";
const base85 = new Set(base85Alphabet);
const base91 = new Set(base91Alphabet);
const j8192 = new Set(j8192Alphabet);
const cjk4096 = (value: string): boolean => [...value].every(char => {
  const code = char.charCodeAt(0);
  return code >= cjk4096Range.first && code <= cjk4096Range.last;
});

export class Tpl {
  make(cfg: EmbedCfg, tpl: EmbedTpl): string {
    return this.fill(tpl.html, {
      DATA: this.envelope(cfg.data, cfg.codec),
      THEME: cfg.theme,
      SURFACE: cfg.surface,
      STYLE: this.attr(cfg.style ?? STYLE),
      LABEL: this.attr(cfg.label ?? "Embedded Unicode art"),
      LOAD_SRC: this.attr(cfg.loadSrc ?? this.peer(cfg.src, "load.js")),
    });
  }

  private envelope(value: string, codec: EmbedCodec): string {
    return `${codec.slice(1)}${this.data(value, codec)}`;
  }

  private data(value: string, codec: EmbedCodec): string {
    if (!value) throw new Error("Embed payload is empty.");
    if (codec === "u3") {
      if ([...value].some(char => !base85.has(char))) throw new Error("Embed payload contains unsafe base85 data.");
      return value;
    }
    if (codec === "u4") {
      if (/^&[JKL][0-9ABC]/u.test(value)) {
        const body = value.slice(3);
        if (!body || [...body].some(char => !j8192.has(char))) throw new Error("Embed payload contains unsafe J8192 data.");
        return value;
      }
      if (/^&[RDB][012]/u.test(value)) {
        const body = value.slice(3);
        if (!body || !cjk4096(body)) throw new Error("Embed payload contains unsafe CJK-4096 data.");
        return value;
      }
      const body = value.startsWith("&r") || value.startsWith("&d") ? value.slice(2) : value;
      if (!body || [...body].some(char => !base91.has(char))) throw new Error("Embed payload contains unsafe base91 data.");
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
    return Object.entries(vals).reduce((out, [key, val]) => out.replaceAll(`{{${key}}}`, () => val), src);
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
