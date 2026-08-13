import type { VersionCfg } from "../types.ts";

export const initVersion = async (base: string, cfg?: VersionCfg): Promise<void> => {
  if (!cfg) return;

  const selector = cfg.selector ?? "[data-version]";
  const nodes = document.querySelectorAll<HTMLElement>(selector);
  if (nodes.length === 0) return;

  try {
    const root = new URL(base.endsWith("/") ? base : `${base}/`, location.origin);
    const file = cfg.file.replace(/^\/+/, "");
    const response = await fetch(new URL(file, root), { cache: "no-cache" });
    if (!response.ok) throw new Error(`Version request failed with ${response.status}.`);

    const json: unknown = await response.json();
    if (!isRecord(json)) throw new Error("Version file is invalid.");

    const value = json["version"];
    if (typeof value !== "string" || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value)) {
      throw new Error("Version file is invalid.");
    }

    nodes.forEach(node => {
      node.textContent = `${cfg.prefix ?? "v"}${value}`;
    });
  } catch {
    nodes.forEach(node => {
      node.textContent = cfg.fallback ?? "v?";
    });
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object"
  && value !== null
  && !Array.isArray(value);
