import type { EmbedPayload, EmbedSurface, EmbedTheme } from "./types.ts";

interface Rgb { readonly r: number; readonly g: number; readonly b: number; }
interface Cell { readonly char: string; readonly fg?: Rgb; readonly bg?: Rgb; }
interface Opts { readonly theme?: EmbedTheme; readonly surface?: EmbedSurface; }
interface Api { readonly mount: (host: Element | null, opts?: Opts) => void; }

declare global {
  interface Window {
    UnicodeArt?: Api;
    __unicodeArtLoad?: Promise<Api>;
  }
}

const hex = (raw: string): Rgb | undefined => {
  const value = raw.startsWith("#") ? raw.slice(1) : raw;
  if (/^[0-9a-fA-F]{3}$/.test(value)) return {
    r: Number.parseInt(value[0]! + value[0]!, 16),
    g: Number.parseInt(value[1]! + value[1]!, 16),
    b: Number.parseInt(value[2]! + value[2]!, 16),
  };
  if (/^[0-9a-fA-F]{6}$/.test(value)) return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
  return undefined;
};

const css = (rgb: Rgb): string => `rgb(${rgb.r} ${rgb.g} ${rgb.b})`;

class Tagged {
  parse(source: string, columns: number, rows: number): Cell[][] {
    const aliases = new Map<string, Rgb>();
    const body: string[] = [];
    for (const line of source.split("\n")) {
      const match = line.match(/^\s*#define\s+([A-Za-z0-9_-]+)\s*=\s*(#[0-9A-Fa-f]{3}(?:[0-9A-Fa-f]{3})?)\s*;\s*$/);
      if (match) {
        const rgb = hex(match[2]!);
        if (rgb) aliases.set(match[1]!, rgb);
      } else body.push(line);
    }

    const out: Cell[][] = [];
    for (let y = 0; y < rows; y += 1) out.push(this.line(body[y] ?? "", columns, aliases));
    return out;
  }

  private line(source: string, columns: number, aliases: ReadonlyMap<string, Rgb>): Cell[] {
    const cells: Cell[] = [];
    let fg: Rgb | undefined, bg: Rgb | undefined;
    for (let i = 0; i < source.length && cells.length < columns;) {
      if (source[i] === "<") {
        const end = source.indexOf(">", i + 1);
        if (end >= 0) {
          let body = source.slice(i + 1, end), background = false;
          if (body.startsWith("@")) { background = true; body = body.slice(1); }
          const reset = body.toLowerCase() === "#default" || body.toLowerCase() === "default";
          const rgb = reset ? undefined : body.startsWith("#") ? hex(body) : aliases.get(body);
          if (reset || rgb) {
            if (background) bg = rgb; else fg = rgb;
            i = end + 1;
            continue;
          }
        }
      }
      const char = source[i] ?? "⠀";
      cells.push({ char, ...(fg ? { fg } : {}), ...(bg ? { bg } : {}) });
      i += 1;
    }
    while (cells.length < columns) cells.push({ char: "⠀" });
    return cells;
  }
}

class View {
  private readonly root: ShadowRoot;
  private readonly media = matchMedia("(prefers-color-scheme: dark)");
  private readonly attrs = new MutationObserver(() => this.render());
  private readonly size = new ResizeObserver(() => this.fit());
  private readonly tagged = new Tagged();
  private frame: HTMLElement | null = null;
  private grid: HTMLElement | null = null;
  private payload: EmbedPayload | null = null;

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

      for (const line of this.tagged.parse(payload.text, payload.columns, payload.rows)) {
        const row = document.createElement("div");
        row.className = "row";
        for (const item of line) {
          const cell = document.createElement("span");
          cell.className = "cell";
          cell.textContent = item.char;
          if (item.fg) cell.style.color = css(item.fg);
          if (item.bg) cell.style.backgroundColor = css(item.bg);
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

  private readPayload(): EmbedPayload {
    const data = this.host.querySelector<HTMLScriptElement>('script[type="application/json"][data-unicode-art-data]');
    if (!data) throw new Error("Unicode Art embed data is missing.");
    const raw = JSON.parse(data.textContent ?? "null") as Partial<EmbedPayload> | null;
    if (!raw || typeof raw.text !== "string") throw new Error("Unicode Art embed text is invalid.");
    const columns = Number(raw.columns), rows = Number(raw.rows);
    if (!Number.isInteger(columns) || columns < 1) throw new Error("Unicode Art embed columns are invalid.");
    if (!Number.isInteger(rows) || rows < 1) throw new Error("Unicode Art embed rows are invalid.");
    return {
      text: raw.text,
      columns,
      rows,
      colour: raw.colour === true,
      colourBackground: raw.colourBackground === true,
      fullColour: raw.fullColour === true,
    };
  }

  private fail(err: unknown): void {
    const frame = document.createElement("div");
    frame.className = "frame";
    frame.style.setProperty("--surface-bg", this.surfaceDark() ? "#24212b" : "#eee7e5");
    frame.style.setProperty("--surface-fg", this.surfaceDark() ? "#f4eff5" : "#201d24");
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

  private surfaceDark(payload: EmbedPayload | null = this.payload): boolean {
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
