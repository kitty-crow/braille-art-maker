import type { KofiCfg } from "../types.ts";

type Kofi = Readonly<{
  draw: (name: string, cfg: Readonly<Record<string, string>>) => void;
}>;

declare global {
  interface Window {
    kofiWidgetOverlay?: Kofi;
  }
}

const scriptUrl = "https://storage.ko-fi.com/cdn/scripts/overlay-widget.js";
const pageBase = "https://ko-fi.com/";
const iconUrl = "https://storage.ko-fi.com/cdn/cup-border.png";
const nodes = [
  ".floatingchat-container-wrap",
  ".floatingchat-container-wrap-mobi",
  ".floating-chat-kofi-popup-iframe",
  ".floating-chat-kofi-popup-iframe-mobi",
  ".floating-chat-kofi-popup-iframe-closer",
  ".floating-chat-kofi-popup-iframe-closer-mobi"
].join(",");

let frame = 0;

export const initKofi = (cfg?: KofiCfg): void => {
  if (!cfg) return;

  const header = document.querySelector<HTMLElement>(cfg.header);
  if (!header) return;

  addFooter(cfg);
  queue(cfg);
  addEventListener("resize", () => queue(cfg));
  addEventListener("scroll", () => queue(cfg), { passive: true });
  new ResizeObserver(() => queue(cfg)).observe(header);

  const wide = matchMedia(`(min-width: ${cfg.wideAt ?? 721}px)`);
  wide.addEventListener("change", () => requestAnimationFrame(() => draw(cfg, wide.matches)));

  const observer = new MutationObserver(() => queue(cfg));
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 2_000);

  if (window.kofiWidgetOverlay) {
    draw(cfg, wide.matches);
    return;
  }

  const old = document.querySelector<HTMLScriptElement>(`script[src="${scriptUrl}"]`);
  if (old) {
    old.addEventListener("load", () => draw(cfg, wide.matches), { once: true });
    return;
  }

  const script = document.createElement("script");
  script.src = scriptUrl;
  script.addEventListener("load", () => draw(cfg, wide.matches), { once: true });
  document.body.appendChild(script);
};

const addFooter = (cfg: KofiCfg): void => {
  if (!cfg.footer) return;

  const host = document.querySelector<HTMLElement>(cfg.footer);
  if (!host || host.querySelector(".pages-kofi-link")) return;

  host.append(cfg.separator ?? " · ");

  const link = document.createElement("a");
  link.className = "pages-kofi-link";
  link.href = cfg.page ?? `${pageBase}${cfg.user}`;
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  const icon = document.createElement("img");
  icon.src = cfg.icon ?? iconUrl;
  icon.alt = "";

  link.append(icon, cfg.footerText ?? "Buy me a coffee");
  host.appendChild(link);
};

const place = (cfg: KofiCfg): void => {
  const header = document.querySelector<HTMLElement>(cfg.header);
  if (!header) return;

  const top = Math.max(12, Math.ceil(header.getBoundingClientRect().bottom + 12));
  const parsed = Number.parseInt(getComputedStyle(header).zIndex, 10);
  const z = Number.isFinite(parsed) ? Math.max(0, parsed - 1) : 49;

  document.documentElement.style.setProperty("--pages-kofi-top", `${top}px`);
  document.documentElement.style.setProperty("--pages-kofi-z", String(z));
};

const queue = (cfg: KofiCfg): void => {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => place(cfg));
};

const draw = (cfg: KofiCfg, wide: boolean): void => {
  document.querySelectorAll(nodes).forEach(node => node.remove());
  window.kofiWidgetOverlay?.draw(cfg.user, {
    type: "floating-chat",
    "floating-chat.donateButton.text": wide ? cfg.desktopText ?? "Buy me a coffee?" : "",
    "floating-chat.donateButton.background-color": cfg.background ?? "#5bc0de",
    "floating-chat.donateButton.text-color": cfg.text ?? "#323842"
  });
  queue(cfg);
};
