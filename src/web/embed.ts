import { packBoundedRaw } from "../embed/bounded-raw.ts";
import type { EmbedSurface, EmbedTheme } from "../embed/types.ts";
import type { PackProgress } from "../embed/ultra-search.ts";
import type { Art, ArtCfg } from "../types.ts";

declare const __WEB_VERSION__: string;

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

const transferAbove = 256;
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

const getWorker = (): Worker => {
  if (worker) return worker;
  const workerUrl = new URL("embed-worker.js", import.meta.url);
  workerUrl.searchParams.set("v", __WEB_VERSION__);
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
): Promise<string> => new Promise((resolve, reject) => {
  // Only the newest generated art matters in the maker. Killing stale work also releases
  // any large Brotli/WASM allocation before a new high-resolution encode begins.
  if (pending.size > 0) cancelWorker(new Error("Embed generation superseded."));

  const id = ++nextId;
  const oneShot = art.columns > transferAbove;
  pending.set(id, { resolve, reject, ...(progress ? { progress } : {}), oneShot });

  if (oneShot) {
    // Do not structured-clone the potentially enormous Art/cellColours graph. Build one
    // exact raw payload on the page, then transfer its ArrayBuffer to the Worker with
    // ownership transfer. The Worker only performs transport compression and is disposed
    // after this job so its high-water WASM memory is released.
    const raw = packBoundedRaw(art, cfg);
    getWorker().postMessage({ id, raw, cfg, theme, surface }, [raw.buffer as ArrayBuffer]);
    return;
  }

  getWorker().postMessage({ id, art, cfg, theme, surface });
});
