import { base85Alphabet } from "./base85.ts";
import { base91Alphabet } from "./base91.ts";
import type { EmbedCodec } from "./codec.ts";
import type { EmbedCfg, EmbedTpl } from "./types.ts";

const STYLE = "display:block;width:min(100%,40rem);aspect-ratio:1";
const base85 = new Set(base85Alphabet);
const base91 = new Set(base91Alphabet);

export class Tpl {
  make(cfg: EmbedCfg, tpl: EmbedTpl): string {
    return this.fill(tpl.html, {
      DATA: this.data(cfg.data, cfg.codec),
      CODEC: cfg.codec,
      THEME: cfg.theme,
      SURFACE: cfg.surface,
      STYLE: this.attr(cfg.style ?? STYLE),
      LABEL: this.attr(cfg.label ?? "Embedded Unicode art"),
      API_SRC: this.attr(cfg.src),
      CSS_SRC: this.attr(cfg.cssSrc ?? this.peer(cfg.src, "embed.css")),
      LOAD_SRC: this.attr(cfg.loadSrc ?? this.peer(cfg.src, "load.js")),
    });
  }

  private data(value: string, codec: EmbedCodec): string {
    if (!value) throw new Error("Embed payload is empty.");
    if (codec === "u3") {
      if ([...value].some(char => !base85.has(char))) throw new Error("Embed payload contains unsafe base85 data.");
      return value;
    }
    if (codec === "u4") {
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
    return Object.entries(vals).reduce((out, [key, val]) => out.replaceAll(`{{${key}}}`, val), src);
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
