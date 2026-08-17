import { packBoundedRaw } from "../embed/bounded-raw.ts";
import type { EmbedSurface, EmbedTheme } from "../embed/types.ts";
import type { PackProgress } from "../embed/ultra-search.ts";
import type { Art, ArtCfg } from "../types.ts";

declare const __WEB_CACHE__: string;

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
  readonly oneShot: boolean;
}

const transferAt = 256;
let nextId = 0;
let worker: Worker | null = null;
const pending = new Map<number, Pending>();

const disposeWorker = (): void => {
  worker?.terminate();
  worker = null;
};

const cancelWorker = (error: Error): void => {
  disposeWorker();
  for (const wait of pending.values()) wait.reject(error);
  pending.clear();
};

export const cancelEmbedHtml = (): void => {
  if (pending.size > 0 || worker) cancelWorker(new Error("Embed generation superseded."));
};

const getWorker = (): Worker => {
  if (worker) return worker;
  const workerUrl = new URL("embed-worker.js", import.meta.url);
  workerUrl.searchParams.set("v", __WEB_CACHE__);
  worker = new Worker(workerUrl, { type: "module" });
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
    if (wait.oneShot && pending.size === 0) disposeWorker();
  });
  worker.addEventListener("error", event => {
    cancelWorker(new Error(event.message || "Embed worker failed."));
  });
  return worker;
};

export const embedHtml = (
  art: Art,
  cfg: ArtCfg,
  theme: EmbedTheme = "auto",
  surface: EmbedSurface = "auto",
  progress?: (value: PackProgress) => void,
  preparedRaw?: Uint8Array,
  story = false,
): Promise<string> => new Promise((resolve, reject) => {
  // Only the newest generated art matters in the studio. Killing stale work also releases
  // any large Brotli/WASM allocation before a new high-resolution encode begins.
  cancelEmbedHtml();

  const id = ++nextId;
  // Full-colour story mode is intentionally forced through the bounded raw handoff.
  // The optimiser path can create very large intermediate candidate graphs at 256 columns
  // and overflow mobile JavaScript stacks before the already chunked story encoder runs.
  const oneShot = art.columns >= transferAt || (story && cfg.fullColour === true);
  pending.set(id, { resolve, reject, ...(progress ? { progress } : {}), oneShot });

  if (oneShot) {
    // Do not structured-clone the potentially enormous Art/cellColours graph. Reuse a
    // cache-prepared exact raw payload when available, otherwise build it once here, then
    // transfer ownership of the ArrayBuffer to the one-shot Worker.
    const raw = preparedRaw ?? packBoundedRaw(art, cfg);
    getWorker().postMessage({ id, raw, cfg, theme, surface, story }, [raw.buffer as ArrayBuffer]);
    return;
  }

  getWorker().postMessage({ id, art, cfg, theme, surface, story });
});
