interface MarkedApi { parse(src: string): string | Promise<string>; }
interface PurifyApi { sanitize(src: string): string; }
interface HighlightApi { highlightElement(node: HTMLElement): void; }
interface Libs { readonly marked: MarkedApi; readonly purify: PurifyApi; readonly highlight: HighlightApi; }

const src = {
  marked: "https://cdn.jsdelivr.net/npm/marked@18.0.7/lib/marked.umd.js",
  purify: "https://cdn.jsdelivr.net/npm/dompurify@3.4.12/dist/purify.min.js",
  highlight: "https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.11.1/highlight.min.js",
} as const;
const loads = new Map<string, Promise<void>>();

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

export class EmbedView {
  private generation = 0;
  constructor(private readonly host: HTMLElement) {}

  render(source: string): void {
    const generation = ++this.generation;
    if (!source) { this.host.replaceChildren(); return; }
    void this.marked(source, generation);
  }

  private async marked(source: string, generation: number): Promise<void> {
    try {
      const api = await libs();
      if (generation !== this.generation) return;
      const ticks = fence(source);
      const rendered = await api.marked.parse(`${ticks}html\n${source}\n${ticks}`);
      if (generation !== this.generation) return;
      this.host.innerHTML = api.purify.sanitize(String(rendered));
      const blocks = this.host.querySelectorAll<HTMLElement>("pre code");
      if (blocks.length === 0) { this.plain(source); return; }
      blocks.forEach(block => api.highlight.highlightElement(block));
    } catch {
      if (generation === this.generation) this.plain(source);
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
}
