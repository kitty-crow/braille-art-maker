import type { EmbedCodec, PackedEmbed } from "../embed/codec.ts";
import { staticArtHtml } from "../embed/static-html.ts";
import { unpackEmbedSmall } from "../embed/small-browser.ts";
import type { Art, ArtCfg } from "../types.ts";

interface MarkedApi { parse(src: string): string | Promise<string>; }
interface PurifyApi { sanitize(src: string): string; }
interface HighlightApi { highlightElement(node: HTMLElement): void; }
interface Libs { readonly marked: MarkedApi; readonly purify: PurifyApi; readonly highlight: HighlightApi; }
type Mode = "compact" | "static";
interface MaskedPayload { readonly source: string; readonly token: string; readonly payload: string; }

const src = {
  marked: "https://cdn.jsdelivr.net/npm/marked@18.0.7/lib/marked.umd.js",
  purify: "https://cdn.jsdelivr.net/npm/dompurify@3.4.12/dist/purify.min.js",
  highlight: "https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.11.1/highlight.min.js",
} as const;
const loads = new Map<string, Promise<void>>();
const richHighlightLimit = 96_000;
const payloadToken = "__UNICODE_ART_PACKED_PAYLOAD__";

const win = (): {
  readonly marked?: MarkedApi;
  readonly DOMPurify?: PurifyApi;
  readonly hljs?: HighlightApi;
} => window as unknown as {
  readonly marked?: MarkedApi;
  readonly DOMPurify?: PurifyApi;
  readonly hljs?: HighlightApi;
};

const load = (url: string, ready: () => boolean): Promise<void> => {
  if (ready()) return Promise.resolve();
  const current = loads.get(url);
  if (current) return current;
  const promise = new Promise<void>((resolve, reject) => {
    const old = document.querySelector<HTMLScriptElement>(`script[src="${url}"]`);
    if (old) {
      old.addEventListener("load", () => resolve(), { once: true });
      old.addEventListener("error", () => reject(new Error(`Could not load ${url}.`)), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error(`Could not load ${url}.`)), { once: true });
    document.head.append(script);
  });
  loads.set(url, promise);
  return promise;
};

const libs = async (): Promise<Libs> => {
  await load(src.marked, () => Boolean(win().marked));
  await load(src.purify, () => Boolean(win().DOMPurify));
  await load(src.highlight, () => Boolean(win().hljs));
  const value = win();
  if (!value.marked || !value.DOMPurify || !value.hljs) throw new Error("Embed highlighting libraries did not initialise.");
  return { marked: value.marked, purify: value.DOMPurify, highlight: value.hljs };
};

const fence = (value: string): string => {
  const longest = Math.max(0, ...(value.match(/`+/gu) ?? []).map(run => run.length));
  return "`".repeat(Math.max(3, longest + 1));
};

const maskCompactPayload = (source: string): MaskedPayload | null => {
  const marker = source.indexOf("data-unicode-art-data");
  if (marker < 0) return null;
  const open = source.lastIndexOf("<script", marker);
  const start = source.indexOf(">", marker);
  const end = start < 0 ? -1 : source.indexOf("</script>", start + 1);
  if (open < 0 || start < 0 || end < 0) return null;
  const payload = source.slice(start + 1, end);
  if (!payload) return null;
  return {
    source: `${source.slice(0, start + 1)}${payloadToken}${source.slice(end)}`,
    token: payloadToken,
    payload,
  };
};

const restoreMaskedPayload = (host: HTMLElement, masked: MaskedPayload): boolean => {
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = node as Text;
    const at = text.data.indexOf(masked.token);
    if (at >= 0) {
      const fragment = document.createDocumentFragment();
      if (at > 0) fragment.append(document.createTextNode(text.data.slice(0, at)));
      const payload = document.createElement("span");
      payload.className = "hljs-string";
      payload.textContent = masked.payload;
      fragment.append(payload);
      const after = text.data.slice(at + masked.token.length);
      if (after) fragment.append(document.createTextNode(after));
      text.replaceWith(fragment);
      return true;
    }
    node = walker.nextNode();
  }
  return false;
};

const textFromMasks = (packed: PackedEmbed): string => {
  const lines = new Array<string>(packed.rows);
  for (let y = 0; y < packed.rows; y += 1) {
    let line = "";
    const offset = y * packed.columns;
    for (let x = 0; x < packed.columns; x += 1) line += String.fromCodePoint(0x2800 + (packed.masks[offset + x] ?? 0));
    lines[y] = line;
  }
  return lines.join("\n");
};

const artFromPacked = (packed: PackedEmbed): { art: Art; cfg: ArtCfg } => ({
  art: {
    text: textFromMasks(packed),
    columns: packed.columns,
    rows: packed.rows,
    dotsWidth: packed.columns * 2,
    dotsHeight: packed.rows * 4,
    threshold: 0,
    density: 0,
    ...(packed.cellColours ? { cellColours: packed.cellColours } : {}),
  },
  cfg: {
    colour: packed.colour,
    colourBackground: packed.colourBackground,
    fullColour: packed.fullColour,
  },
});

const packedSource = (html: string): { codec: EmbedCodec; data: string } => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const envelope = doc.querySelector<HTMLScriptElement>('script[type="application/octet-stream"][data-unicode-art-data]')?.textContent?.trim() ?? "";
  const digit = envelope[0];
  if (digit !== "1" && digit !== "2" && digit !== "3" && digit !== "4") throw new Error("Compact embed payload is missing its codec marker.");
  if (envelope.length < 2) throw new Error("Compact embed payload is empty.");
  return { codec: `u${digit}` as EmbedCodec, data: envelope.slice(1) };
};

export class EmbedView {
  private renderGeneration = 0;
  private staticGeneration = 0;
  private mode: Mode = "compact";
  private compact = "";
  private staticHtml = "";
  private readonly compactTab: HTMLButtonElement;
  private readonly staticTab: HTMLButtonElement;

  constructor(private readonly host: HTMLElement) {
    const tabs = document.createElement("div");
    tabs.className = "embed-code-tabs";
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "Embed format");
    this.compactTab = this.tab("Compact", "compact", true);
    this.staticTab = this.tab("No JavaScript", "static", false);
    tabs.append(this.compactTab, this.staticTab);
    host.before(tabs);

    const copy = document.querySelector<HTMLButtonElement>("#copy-embed");
    copy?.addEventListener("click", event => {
      if (this.mode !== "static") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void this.copyStatic(copy);
    }, { capture: true });
  }

  render(source: string): void {
    this.compact = source;
    this.staticHtml = "";
    ++this.staticGeneration;
    if (!source) {
      this.host.replaceChildren();
      return;
    }
    if (this.mode === "static") void this.showStatic();
    else this.renderCode(source);
  }

  private tab(label: string, mode: Mode, selected: boolean): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "embed-code-tab";
    button.textContent = label;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(selected));
    button.dataset.mode = mode;
    if (mode === "static") button.title = "Self-contained HTML with inline CSS only: no JavaScript, external scripts, stylesheets or fetching.";
    button.addEventListener("click", () => this.select(mode));
    return button;
  }

  private select(mode: Mode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.compactTab.setAttribute("aria-selected", String(mode === "compact"));
    this.staticTab.setAttribute("aria-selected", String(mode === "static"));
    if (!this.compact) {
      this.host.replaceChildren();
      return;
    }
    if (mode === "compact") this.renderCode(this.compact);
    else void this.showStatic();
  }

  private async showStatic(): Promise<string> {
    if (this.staticHtml) {
      this.renderCode(this.staticHtml);
      return this.staticHtml;
    }
    const compact = this.compact;
    const generation = ++this.staticGeneration;
    this.message("Building self-contained HTML…");
    try {
      const packed = packedSource(compact);
      const decoded = await unpackEmbedSmall(packed.data, packed.codec);
      if (generation !== this.staticGeneration || compact !== this.compact) return "";
      const value = artFromPacked(decoded);
      const html = staticArtHtml(value.art, value.cfg);
      if (generation !== this.staticGeneration || compact !== this.compact) return "";
      this.staticHtml = html;
      if (this.mode === "static") this.renderCode(html);
      return html;
    } catch (error) {
      if (generation !== this.staticGeneration || compact !== this.compact) return "";
      const message = error instanceof Error ? error.message : "Static HTML generation failed.";
      this.message(`No-JavaScript HTML unavailable: ${message}`);
      return "";
    }
  }

  private async copyStatic(button: HTMLButtonElement): Promise<void> {
    const html = this.staticHtml || await this.showStatic();
    if (!html) return;
    try {
      await navigator.clipboard.writeText(html);
      const old = button.textContent;
      button.textContent = "Copied static HTML";
      setTimeout(() => { button.textContent = old; }, 1100);
    } catch {
      this.message("Clipboard access was blocked. Select the displayed static HTML and copy it manually.");
    }
  }

  private renderCode(source: string): void {
    const generation = ++this.renderGeneration;
    if (source.length > richHighlightLimit) {
      const masked = maskCompactPayload(source);
      if (masked) {
        void this.marked(source, generation, masked);
        return;
      }
      // Static no-JS HTML can contain millions of repeated span tags. Keep that representation
      // as a single plain text node rather than creating a syntax-token DOM of comparable size.
      this.plain(source);
      return;
    }
    void this.marked(source, generation);
  }

  private async marked(source: string, generation: number, masked?: MaskedPayload): Promise<void> {
    try {
      const api = await libs();
      if (generation !== this.renderGeneration) return;
      const display = masked?.source ?? source;
      const ticks = fence(display);
      const rendered = await api.marked.parse(`${ticks}html\n${display}\n${ticks}`);
      if (generation !== this.renderGeneration) return;
      this.host.innerHTML = api.purify.sanitize(String(rendered));
      const blocks = this.host.querySelectorAll<HTMLElement>("pre code");
      if (blocks.length === 0) { this.plain(source); return; }
      blocks.forEach(block => api.highlight.highlightElement(block));
      if (masked && !restoreMaskedPayload(this.host, masked)) this.plain(source);
    } catch {
      if (generation === this.renderGeneration) this.plain(source);
    }
  }

  private plain(source: string): void {
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.className = "language-html";
    code.textContent = source;
    pre.append(code);
    this.host.replaceChildren(pre);
  }

  private message(text: string): void {
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.textContent = text;
    pre.append(code);
    this.host.replaceChildren(pre);
  }
}
