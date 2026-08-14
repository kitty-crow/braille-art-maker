import type { EmbedSurface, EmbedTheme } from "../embed/types.ts";
import type { PackProgress } from "../embed/ultra-search.ts";
import type { Art, ArtCfg } from "../types.ts";

export type EmbedSource = { readonly art: Art } | { readonly artKey: string };

interface Response {
  readonly id: number;
  readonly html?: string;
  readonly progress?: PackProgress;
  readonly error?: string;
}

interface Pending {
  readonly resolve: (value: string) => void;
  readonly reject: (error: Error) => void;
  readonly progress?: (value: PackProgress) => void;
}

let nextId = 0;
let worker: Worker | null = null;
const pending = new Map<number, Pending>();

const getWorker = (): Worker => {
  if (worker) return worker;
  worker = new Worker(new URL("embed-worker.js", import.meta.url), { type: "module" });
  worker.addEventListener("message", event => {
    const response = event.data as Response;
    const wait = pending.get(response.id);
    if (!wait) return;
    if (response.progress) {
      wait.progress?.(response.progress);
      return;
    }
    pending.delete(response.id);
    if (response.error) wait.reject(new Error(response.error));
    else if (response.html !== undefined) wait.resolve(response.html);
    else wait.reject(new Error("Embed worker returned no result."));
  });
  worker.addEventListener("error", event => {
    const error = new Error(event.message || "Embed worker failed.");
    for (const wait of pending.values()) wait.reject(error);
    pending.clear();
    worker?.terminate();
    worker = null;
  });
  return worker;
};

export const embedHtml = (
  source: EmbedSource,
  cfg: ArtCfg,
  theme: EmbedTheme = "auto",
  surface: EmbedSurface = "auto",
  progress?: (value: PackProgress) => void,
): Promise<string> => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, { resolve, reject, ...(progress ? { progress } : {}) });
  getWorker().postMessage({ id, ...source, cfg, theme, surface });
});
