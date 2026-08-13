import type { LibCfg, ReadmeCfg } from "../types.ts";

interface Marked {
  parse(src: string): string | Promise<string>;
}

interface Purify {
  sanitize(src: string): string;
}

interface Highlight {
  highlightElement(node: HTMLElement): void;
}

interface Libs {
  readonly marked: Marked;
  readonly purify: Purify;
  readonly highlight: Highlight;
}

const defaults: Required<LibCfg> = {
  marked: "https://cdn.jsdelivr.net/npm/marked@18.0.7/lib/marked.umd.js",
  purify: "https://cdn.jsdelivr.net/npm/dompurify@3.4.12/dist/purify.min.js",
  highlight: "https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.11.1/highlight.min.js"
};

const loads = new Map<string, Promise<void>>();

export const initReadme = async (cfg?: ReadmeCfg): Promise<void> => {
  if (!cfg) return;

  const content = document.querySelector<HTMLElement>(cfg.content ?? "#readme-content");
  const status = document.querySelector<HTMLElement>(cfg.status ?? "#readme-status");
  if (!content || !status) return;

  const branch = cfg.branch ?? "main";
  const path = cfg.path ?? "README.md";
  const repo = `https://github.com/${cfg.owner}/${cfg.repo}`;
  const raw = `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${branch}/${path}`;
  const blobBase = `${repo}/blob/${branch}/`;
  const rawBase = `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${branch}/`;

  try {
    await ensure(cfg.libs);
    const libs = getLibs();
    const response = await fetch(raw, {
      headers: { Accept: "text/markdown,text/plain;q=0.9,*/*;q=0.1" },
      cache: "no-cache"
    });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}.`);

    const html = await libs.marked.parse(await response.text());
    content.innerHTML = libs.purify.sanitize(html);
    rewrite(content, blobBase, rawBase, repo);
    content.querySelectorAll<HTMLElement>("pre code").forEach(node => libs.highlight.highlightElement(node));
    status.textContent = "README loaded.";
    status.hidden = true;
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : String(error);
    status.hidden = false;
    const paragraph = document.createElement("p");
    paragraph.append("Open the README in the ");
    const link = document.createElement("a");
    link.href = repo;
    link.textContent = "GitHub repository";
    paragraph.append(link, ".");
    content.replaceChildren(paragraph);
  }
};

const ensure = async (cfg?: LibCfg): Promise<void> => {
  const libs: Required<LibCfg> = {
    marked: cfg?.marked ?? defaults.marked,
    purify: cfg?.purify ?? defaults.purify,
    highlight: cfg?.highlight ?? defaults.highlight
  };

  await load(libs.marked, () => Boolean(windowValue().marked));
  await load(libs.purify, () => Boolean(windowValue().DOMPurify));
  await load(libs.highlight, () => Boolean(windowValue().hljs));
};

const load = async (src: string, ready: () => boolean): Promise<void> => {
  if (ready()) return;

  const current = loads.get(src);
  if (current) return current;

  const promise = new Promise<void>((resolve, reject) => {
    const old = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (old) {
      old.addEventListener("load", () => resolve(), { once: true });
      old.addEventListener("error", () => reject(new Error(`Could not load ${src}.`)), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error(`Could not load ${src}.`)), { once: true });
    document.head.appendChild(script);
  });

  loads.set(src, promise);
  return promise;
};

const getLibs = (): Libs => {
  const win = windowValue();
  if (!win.marked || !win.DOMPurify || !win.hljs) throw new Error("README rendering libraries did not load.");
  return { marked: win.marked, purify: win.DOMPurify, highlight: win.hljs };
};

const rewrite = (content: HTMLElement, blobBase: string, rawBase: string, repo: string): void => {
  content.querySelectorAll<HTMLAnchorElement>("a[href]").forEach(link => {
    const value = link.getAttribute("href") ?? "";
    if (!value || value.startsWith("#")) return;
    link.href = resolve(value, blobBase, repo);
    if (link.origin === location.origin) return;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });

  content.querySelectorAll<HTMLImageElement>("img[src]").forEach(image => {
    const value = image.getAttribute("src") ?? "";
    if (!value) return;
    image.src = resolve(value, rawBase, repo);
    image.loading = "lazy";
  });
};

const resolve = (value: string, base: string, fallback: string): string => {
  try {
    return new URL(value, base).href;
  } catch {
    return fallback;
  }
};

const windowValue = (): {
  readonly marked?: Marked;
  readonly DOMPurify?: Purify;
  readonly hljs?: Highlight;
} => window as unknown as {
  readonly marked?: Marked;
  readonly DOMPurify?: Purify;
  readonly hljs?: Highlight;
};
