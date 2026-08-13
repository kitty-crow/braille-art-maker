import type { Theme, ThemeCfg } from "../types.ts";

const media = matchMedia("(prefers-color-scheme: dark)");

export const boot = (cfg?: ThemeCfg): void => {
  if (!cfg) return;
  apply(cfg, active(cfg));
};

export const initTheme = (cfg?: ThemeCfg): void => {
  if (!cfg) return;

  apply(cfg, active(cfg));
  controls(cfg, active(cfg));

  const selector = cfg.toggle ?? "[data-theme-toggle]";
  document.querySelectorAll<HTMLButtonElement>(selector).forEach(button => {
    button.addEventListener("click", () => toggle(cfg));
  });

  media.addEventListener("change", () => {
    if (stored(cfg)) return;
    apply(cfg, preferred());
  });

  addEventListener("storage", event => {
    if (event.key !== cfg.key) return;
    apply(cfg, active(cfg));
  });
};

const preferred = (): Theme => media.matches ? "dark" : "light";

const stored = (cfg: ThemeCfg): Theme | null => {
  try {
    const value = localStorage.getItem(cfg.key);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
};

const active = (cfg: ThemeCfg): Theme => stored(cfg) ?? preferred();

const apply = (cfg: ThemeCfg, theme: Theme): void => {
  document.documentElement.dataset["theme"] = theme;
  document.documentElement.style.colorScheme = theme;

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = cfg.colours[theme];

  controls(cfg, theme);
  if (cfg.event) dispatchEvent(new CustomEvent<Theme>(cfg.event, { detail: theme }));
};

const controls = (cfg: ThemeCfg, theme: Theme): void => {
  const selector = cfg.toggle ?? "[data-theme-toggle]";
  const labelSelector = cfg.label ?? "[data-theme-label]";
  const dark = theme === "dark";
  const icon = dark ? cfg.darkIcon ?? "🌙" : cfg.lightIcon ?? "☀️";

  document.querySelectorAll<HTMLButtonElement>(selector).forEach(button => {
    button.dataset["themeState"] = theme;
    button.setAttribute("aria-pressed", String(dark));
    button.setAttribute("aria-label", `Use ${dark ? "light" : "dark"} theme`);

    const label = button.querySelector<HTMLElement>(labelSelector);
    if (label) label.textContent = icon;
    else button.textContent = icon;
  });
};

const toggle = (cfg: ThemeCfg): void => {
  const next: Theme = active(cfg) === "dark" ? "light" : "dark";

  try {
    localStorage.setItem(cfg.key, next);
  } catch {
    console.warn("Theme preference could not be saved.");
  }

  apply(cfg, next);
};
