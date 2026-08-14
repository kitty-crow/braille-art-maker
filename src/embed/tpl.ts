import type { EmbedCfg, EmbedTpl } from "./types.ts";

const STYLE = "display:block;width:min(100%,40rem);aspect-ratio:1";

export class Tpl {
  make(cfg: EmbedCfg, tpl: EmbedTpl): string {
    return this.fill(tpl.html, {
      DATA: this.data(cfg.data),
      THEME: cfg.theme,
      SURFACE: cfg.surface,
      STYLE: this.attr(cfg.style ?? STYLE),
      LABEL: this.attr(cfg.label ?? "Embedded Unicode art"),
      API_SRC: this.attr(cfg.src),
      CSS_SRC: this.attr(cfg.cssSrc ?? this.peer(cfg.src, "embed.css")),
      LOAD_SRC: this.attr(cfg.loadSrc ?? this.peer(cfg.src, "load.js")),
    });
  }

  private data(value: string): string {
    if (!value || !/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error("Embed payload must be base64url data.");
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
