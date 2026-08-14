import type { EmbedCodec, PackedEmbed } from "./codec.ts";
import { unpackEmbedSmall } from "./small-browser.ts";
import type { EmbedSurface, EmbedTheme } from "./types.ts";
import type { CellColour, Rgb } from "../types.ts";
import { exactBrailleFont, type BrailleFontFit } from "../web/braille-font.ts";

interface Opts { readonly theme?: EmbedTheme; readonly surface?: EmbedSurface; }
interface Api { readonly mount: (host: Element | null, opts?: Opts) => void; }

declare global {
  interface Window {
    UnicodeArt?: Api;
    __unicodeArtLoad?: Promise<Api>;
  }
}

const compactAbove = 256;
const runtimeSrc = document.currentScript instanceof HTMLScriptElement ? document.currentScript.src : "";
const runtimeCss = runtimeSrc ? new URL("embed.css", runtimeSrc).href : "";
const css = (rgb: Rgb): string => `rgb(${rgb.r} ${rgb.g} ${rgb.b})`;
const codecFromMarker = (marker: string): EmbedCodec | null => marker === "1" || marker === "2" || marker === "3" || marker === "4" ? `u${marker}` as EmbedCodec : null;
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
    const colour = rgb ? css(rgb) : fallback;
    stops.push(`${colour} ${pct(start, columns)}`, `${colour} ${pct(end, columns)}`);
    start = end;
  }
  return explicit ? `linear-gradient(to right,${stops.join(",")})` : null;
};

const rowText = (payload: PackedEmbed, y: number): string => {
  let text = "";
  const offset = y * payload.columns;
  for (let x = 0; x < payload.columns; x += 1) text += String.fromCodePoint(0x2800 + (payload.masks[offset + x] ?? 0));
  return text;
};

class View {
  private readonly root: ShadowRoot;
  private readonly media = matchMedia("(prefers-color-scheme: dark)");
  private readonly attrs = new MutationObserver(() => { void this.render(); });
  private readonly size = new ResizeObserver(() => this.fit());
  private frame: HTMLElement | null = null;
  private grid: HTMLElement | null = null;
  private payload: PackedEmbed | null = null;
  private mode: "cells" | "rows" | null = null;
  private family: string | null = null;
  private compactAllowed = false;
  private generation = 0;

  constructor(private readonly host: HTMLElement, private readonly opts: Opts) {
    this.root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  }

  run(): void {
    this.attrs.observe(this.host, { attributes: true });
    this.size.observe(this.host);
    this.media.addEventListener("change", this.onTheme);
    void this.render();
  }

  private readonly onTheme = (): void => {
    if (this.theme() === "auto" || this.surface() === "auto") void this.render();
  };

  private async render(): Promise<void> {
    const generation = ++this.generation;
    try {
      const payload = await this.readPayload();
      if (generation !== this.generation) return;
      const legacy = this.host.querySelector<HTMLTemplateElement>("template[data-unicode-art-template]");
      this.root.replaceChildren(legacy ? legacy.content.cloneNode(true) : this.scaffold());
      const frame = this.need<HTMLElement>(".frame");
      const grid = this.need<HTMLElement>("[data-unicode-art-root]");
      const dark = this.surfaceDark(payload);
      frame.style.setProperty("--surface-bg", dark ? "#24212b" : "#eee7e5");
      frame.style.setProperty("--surface-fg", dark ? "#f4eff5" : "#201d24");
      grid.style.setProperty("--cols", String(payload.columns));

      this.payload = payload;
      this.frame = frame;
      this.grid = grid;
      this.mode = null;
      this.family = null;
      this.compactAllowed = legacy === null;
      requestAnimationFrame(() => this.fit());
      void document.fonts?.ready.then(() => this.fit());
    } catch (err: unknown) {
      if (generation === this.generation) this.fail(err);
    }
  }

  private renderCells(payload: PackedEmbed): void {
    if (!this.grid) return;
    const fragment = document.createDocumentFragment();
    for (let y = 0; y < payload.rows; y += 1) {
      const row = document.createElement("div");
      row.className = "row";
      for (let x = 0; x < payload.columns; x += 1) {
        const at = y * payload.columns + x;
        const cell = document.createElement("span");
        const colour = payload.cellColours?.[at];
        cell.className = "cell";
        cell.textContent = String.fromCodePoint(0x2800 + (payload.masks[at] ?? 0));
        if (colour?.fg) cell.style.color = css(colour.fg);
        if (colour?.bg) cell.style.backgroundColor = css(colour.bg);
        row.append(cell);
      }
      fragment.append(row);
    }
    this.grid.replaceChildren(fragment);
    this.grid.dataset.unicodeRender = "cells";
    this.grid.style.removeProperty("font-family");
  }

  private renderRows(payload: PackedEmbed, fit: BrailleFontFit): void {
    if (!this.grid) return;
    const fragment = document.createDocumentFragment();
    for (let y = 0; y < payload.rows; y += 1) {
      const offset = y * payload.columns;
      const row = document.createElement("div");
      row.className = "row";
      const text = rowText(payload, y);
      if (!payload.cellColours) row.textContent = text;
      else {
        const bg = gradient(payload.cellColours, offset, payload.columns, true, "transparent");
        const fg = gradient(payload.cellColours, offset, payload.columns, false, "var(--surface-fg)");
        if (bg) row.style.backgroundImage = bg;
        const ink = document.createElement("span");
        ink.className = fg ? "ink ink-colour" : "ink";
        ink.textContent = text;
        if (fg) ink.style.backgroundImage = fg;
        row.append(ink);
      }
      fragment.append(row);
    }
    this.grid.replaceChildren(fragment);
    this.grid.dataset.unicodeRender = "rows";
    this.grid.style.fontFamily = fit.family;
  }

  private scaffold(): DocumentFragment {
    const fragment = document.createDocumentFragment();
    if (runtimeCss) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = runtimeCss;
      fragment.append(link);
    }
    const frame = document.createElement("div");
    frame.className = "frame";
    const grid = document.createElement("div");
    grid.className = "grid";
    grid.dataset.unicodeArtRoot = "";
    frame.append(grid);
    fragment.append(frame);
    return fragment;
  }

  private async readPayload(): Promise<PackedEmbed> {
    const data = this.host.querySelector<HTMLScriptElement>("script[data-unicode-art-data]");
    if (!data) throw new Error("Unicode Art embed data is missing.");
    let source = (data.textContent ?? "").trim();
    const explicit = data.dataset.codec;
    let codec: EmbedCodec | null = explicit === "u1" || explicit === "u2" || explicit === "u3" || explicit === "u4" ? explicit : null;
    if (!codec) {
      codec = codecFromMarker(source[0] ?? "");
      if (!codec) throw new Error("Unicode Art embed codec is not supported.");
      source = source.slice(1);
    }
    return unpackEmbedSmall(source, codec);
  }

  private fail(err: unknown): void {
    const frame = document.createElement("div");
    frame.className = "frame";
    const dark = this.surfaceDark();
    frame.style.setProperty("--surface-bg", dark ? "#24212b" : "#eee7e5");
    frame.style.setProperty("--surface-fg", dark ? "#f4eff5" : "#201d24");
    const msg = document.createElement("div");
    msg.className = "err";
    msg.textContent = err instanceof Error ? err.message : String(err);
    frame.append(msg);
    this.root.replaceChildren(frame);
    this.payload = null;
    this.frame = frame;
    this.grid = null;
    this.mode = null;
    this.family = null;
    this.compactAllowed = false;
  }

  private legacyFont(target: number): number {
    if (!this.grid) return 2.5;
    this.grid.style.fontSize = "100px";
    const probe = document.createElement("span");
    probe.className = "probe";
    probe.textContent = "⣿".repeat(200);
    this.grid.append(probe);
    const advance100 = probe.getBoundingClientRect().width / 200;
    probe.remove();
    return advance100 > 0 ? 100 * target / advance100 : 2.5;
  }

  private fit(): void {
    if (!this.payload || !this.frame || !this.grid) return;
    const width = this.frame.clientWidth || this.host.clientWidth;
    const height = this.frame.clientHeight || this.host.clientHeight || width;
    const target = Math.max(0.5, Math.min(width / this.payload.columns, height / (this.payload.rows * 2)));
    const fit = this.compactAllowed && this.payload.columns > compactAbove ? exactBrailleFont(this.grid, target) : null;
    const mode: "cells" | "rows" = fit ? "rows" : "cells";
    const family = fit?.family ?? null;

    if (this.mode !== mode || (mode === "rows" && this.family !== family) || this.grid.childNodes.length === 0) {
      if (fit) this.renderRows(this.payload, fit);
      else this.renderCells(this.payload);
      this.mode = mode;
      this.family = family;
    }

    const font = fit?.fontPx ?? this.legacyFont(target);
    this.grid.style.fontSize = `${font}px`;
    this.grid.style.setProperty("--cell", `${target}px`);
  }

  private theme(): EmbedTheme {
    const raw = this.opts.theme ?? this.host.dataset.theme ?? "auto";
    return raw === "light" || raw === "dark" ? raw : "auto";
  }

  private surface(): EmbedSurface {
    const raw = this.opts.surface ?? this.host.dataset.surface ?? "auto";
    return raw === "light" || raw === "dark" ? raw : "auto";
  }

  private themeDark(): boolean {
    const theme = this.theme();
    if (theme === "dark") return true;
    if (theme === "light") return false;
    const page = document.documentElement.dataset.theme;
    return page === "dark" || (page !== "light" && this.media.matches);
  }

  private surfaceDark(payload: PackedEmbed | null = this.payload): boolean {
    const surface = this.surface();
    if (surface === "dark") return true;
    if (surface === "light") return false;
    if (this.themeDark()) return true;
    return payload?.colour === true && !payload.colourBackground && !payload.fullColour;
  }

  private need<T extends Element>(query: string): T {
    const element = this.root.querySelector<T>(query);
    if (!element) throw new Error(`Missing embed element: ${query}`);
    return element;
  }
}

export function mount(host: Element | null, opts: Opts = {}): void {
  if (!(host instanceof HTMLElement)) throw new Error("Unicode Art host must be an HTMLElement.");
  new View(host, opts).run();
}

window.UnicodeArt = { mount };
