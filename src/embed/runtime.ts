import { unpackEmbed } from "./codec.ts";
import type { EmbedCodec, PackedEmbed } from "./codec.ts";
import type { EmbedSurface, EmbedTheme } from "./types.ts";

interface Opts { readonly theme?: EmbedTheme; readonly surface?: EmbedSurface; }
interface Api { readonly mount: (host: Element | null, opts?: Opts) => void; }

declare global {
  interface Window {
    UnicodeArt?: Api;
    __unicodeArtLoad?: Promise<Api>;
  }
}

const css = (rgb: { readonly r: number; readonly g: number; readonly b: number }): string => `rgb(${rgb.r} ${rgb.g} ${rgb.b})`;

class View {
  private readonly root: ShadowRoot;
  private readonly media = matchMedia("(prefers-color-scheme: dark)");
  private readonly attrs = new MutationObserver(() => this.render());
  private readonly size = new ResizeObserver(() => this.fit());
  private frame: HTMLElement | null = null;
  private grid: HTMLElement | null = null;
  private payload: PackedEmbed | null = null;

  constructor(private readonly host: HTMLElement, private readonly opts: Opts) {
    this.root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  }

  run(): void {
    this.attrs.observe(this.host, { attributes: true });
    this.size.observe(this.host);
    this.media.addEventListener("change", this.onTheme);
    this.render();
  }

  private readonly onTheme = (): void => {
    if (this.theme() === "auto" || this.surface() === "auto") this.render();
  };

  private render(): void {
    try {
      const payload = this.readPayload();
      const tpl = this.host.querySelector<HTMLTemplateElement>("template[data-unicode-art-template]");
      if (!tpl) throw new Error("Unicode Art embed template is missing.");
      this.root.replaceChildren(tpl.content.cloneNode(true));
      const frame = this.need<HTMLElement>(".frame");
      const grid = this.need<HTMLElement>("[data-unicode-art-root]");
      const dark = this.surfaceDark(payload);
      frame.style.setProperty("--surface-bg", dark ? "#24212b" : "#eee7e5");
      frame.style.setProperty("--surface-fg", dark ? "#f4eff5" : "#201d24");
      grid.style.setProperty("--cols", String(payload.columns));

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
        grid.append(row);
      }

      this.payload = payload;
      this.frame = frame;
      this.grid = grid;
      requestAnimationFrame(() => this.fit());
      void document.fonts?.ready.then(() => this.fit());
    } catch (err: unknown) {
      this.fail(err);
    }
  }

  private readPayload(): PackedEmbed {
    const data = this.host.querySelector<HTMLScriptElement>("script[data-unicode-art-data]");
    if (!data) throw new Error("Unicode Art embed data is missing.");
    const codec = data.dataset.codec;
    if (codec !== "u1" && codec !== "u2") throw new Error("Unicode Art embed codec is not supported.");
    return unpackEmbed(data.textContent ?? "", codec as EmbedCodec);
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
  }

  private fit(): void {
    if (!this.payload || !this.frame || !this.grid) return;
    this.grid.style.fontSize = "10px";
    const probe = document.createElement("span");
    probe.className = "probe";
    probe.textContent = "⣿".repeat(200);
    this.grid.append(probe);
    const advance = probe.getBoundingClientRect().width / 200;
    probe.remove();
    const width = this.frame.clientWidth || this.host.clientWidth;
    const height = this.frame.clientHeight || this.host.clientHeight || width;
    const target = Math.max(0.5, Math.min(width / this.payload.columns, height / (this.payload.rows * 2)));
    const font = advance > 0 ? 10 * target / advance : 2.5;
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
