import type { EmbedCodec, PackedEmbed } from "./codec.ts";
import { unpackEmbedSmall } from "./small-browser.ts";
import type { EmbedSurface, EmbedTheme } from "./types.ts";
import type { CellColour, Rgb } from "../types.ts";

interface Opts { readonly theme?: EmbedTheme; readonly surface?: EmbedSurface; }
interface Api { readonly mount: (host: Element | null, opts?: Opts) => void; }
interface BrailleMetric { readonly family: string; readonly advance100: number; readonly spread100: number; }

declare global {
  interface Window {
    UnicodeArt?: Api;
    __unicodeArtLoad?: Promise<Api>;
  }
}

const compactThreshold = 256;
const metricTolerance = 0.125;
const brailleProbe = Array.from({ length: 256 }, (_, mask) => String.fromCodePoint(0x2800 + mask)).join("");
const fontCandidates = [
  '"Apple Braille", monospace',
  '"Noto Sans Symbols 2", monospace',
  '"DejaVu Sans Mono", monospace',
  '"Cascadia Mono", monospace',
  '"Cascadia Code", monospace',
  '"Segoe UI Symbol", monospace',
  "monospace",
] as const;

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

const measureFamily = (host: HTMLElement, family: string): BrailleMetric | null => {
  const probe = document.createElement("span");
  probe.className = "probe";
  probe.style.fontFamily = family;
  probe.style.fontSize = "100px";
  probe.textContent = brailleProbe;
  host.append(probe);
  const node = probe.firstChild;
  if (!(node instanceof Text)) { probe.remove(); return null; }
  const range = document.createRange();
  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  let sum = 0;
  for (let i = 0; i < 256; i += 1) {
    range.setStart(node, i);
    range.setEnd(node, i + 1);
    const width = range.getBoundingClientRect().width;
    if (!(width > 0)) { probe.remove(); return null; }
    min = Math.min(min, width);
    max = Math.max(max, width);
    sum += width;
  }
  probe.remove();
  return { family, advance100: sum / 256, spread100: max - min };
};

const compactMetric = (host: HTMLElement): BrailleMetric | null => {
  let best: BrailleMetric | null = null;
  for (const family of fontCandidates) {
    const metric = measureFamily(host, family);
    if (metric && (!best || metric.spread100 < best.spread100)) best = metric;
  }
  return best && best.spread100 <= metricTolerance ? best : null;
};

class View {
  private readonly root: ShadowRoot;
  private readonly media = matchMedia("(prefers-color-scheme: dark)");
  private readonly attrs = new MutationObserver(() => this.syncSurface());
  private readonly size = new ResizeObserver(() => this.fit());
  private frame: HTMLElement | null = null;
  private grid: HTMLElement | null = null;
  private columns = 0;
  private rows = 0;
  private foregroundOnly = false;
  private advance100 = 0;
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
    if (this.theme() === "auto" || this.surface() === "auto") this.syncSurface();
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
      grid.style.setProperty("--cols", String(payload.columns));

      const metric = payload.columns > compactThreshold ? compactMetric(grid) : null;
      const compact = metric !== null;
      grid.dataset.unicodeRender = compact ? "rows" : "cells";
      if (metric) grid.style.fontFamily = metric.family;

      const fragment = document.createDocumentFragment();
      for (let y = 0; y < payload.rows; y += 1) {
        const row = document.createElement("div");
        row.className = "row";
        if (compact) {
          const offset = y * payload.columns;
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
        } else {
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
        }
        fragment.append(row);
      }
      grid.append(fragment);

      this.columns = payload.columns;
      this.rows = payload.rows;
      this.foregroundOnly = payload.colour && !payload.colourBackground && !payload.fullColour;
      this.advance100 = metric?.advance100 ?? 0;
      this.frame = frame;
      this.grid = grid;
      this.syncSurface();
      requestAnimationFrame(() => this.fit());
      void document.fonts?.ready.then(() => this.fit());
    } catch (err: unknown) {
      if (generation === this.generation) this.fail(err);
    }
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

  private syncSurface(): void {
    if (!this.frame) return;
    const dark = this.surfaceDark();
    this.frame.style.setProperty("--surface-bg", dark ? "#24212b" : "#eee7e5");
    this.frame.style.setProperty("--surface-fg", dark ? "#f4eff5" : "#201d24");
  }

  private fail(err: unknown): void {
    const frame = document.createElement("div");
    frame.className = "frame";
    this.frame = frame;
    this.columns = 0;
    this.rows = 0;
    this.foregroundOnly = false;
    this.advance100 = 0;
    this.syncSurface();
    const msg = document.createElement("div");
    msg.className = "err";
    msg.textContent = err instanceof Error ? err.message : String(err);
    frame.append(msg);
    this.root.replaceChildren(frame);
    this.grid = null;
  }

  private fit(): void {
    if (!this.columns || !this.rows || !this.frame || !this.grid) return;
    let advance = this.advance100;
    if (!(advance > 0)) {
      this.grid.style.fontSize = "100px";
      const probe = document.createElement("span");
      probe.className = "probe";
      probe.textContent = "⣿".repeat(200);
      this.grid.append(probe);
      advance = probe.getBoundingClientRect().width / 200;
      probe.remove();
    }
    const width = this.frame.clientWidth || this.host.clientWidth;
    const height = this.frame.clientHeight || this.host.clientHeight || width;
    const target = Math.max(0.5, Math.min(width / this.columns, height / (this.rows * 2)));
    const font = advance > 0 ? 100 * target / advance : 2.5;
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

  private surfaceDark(): boolean {
    const surface = this.surface();
    if (surface === "dark") return true;
    if (surface === "light") return false;
    if (this.themeDark()) return true;
    return this.foregroundOnly;
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
