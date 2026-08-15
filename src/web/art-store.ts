import { unpackBoundedRaw } from "../embed/bounded-raw.ts";
import type { Art, ArtCfg } from "../types.ts";
import { beginCacheRestore, finishCacheRestore } from "./cache-guard.ts";

const dbName = "unicode-art-studio-cache";
const dbVersion = 2;
const legacyStore = "art";
const sessionStore = "session-v2";
const artStore = "art-v2";
const embedStore = "embed-v2";
const latestKey = "latest";
const restoreSettleMs = 10_000;

interface ArtMeta {
  readonly columns: number;
  readonly rows: number;
  readonly dotsWidth: number;
  readonly dotsHeight: number;
  readonly threshold: number;
  readonly density: number;
}

interface SessionRecord {
  readonly version: string;
  readonly id: string;
  readonly name: string;
  readonly source: Blob | string;
  readonly cfg: ArtCfg;
  readonly paths: number;
  readonly rectangles: number;
  readonly art: ArtMeta;
}

interface EmbedRecord {
  readonly version: string;
  readonly id: string;
  readonly html: Blob;
}

export interface RestoredArt {
  readonly id: string;
  readonly name: string;
  readonly source: Blob | string;
  readonly cfg: ArtCfg;
  readonly paths: number;
  readonly rectangles: number;
  readonly art: Art;
  readonly embed?: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

const db = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable."));
      return;
    }
    const request = indexedDB.open(dbName, dbVersion);
    request.addEventListener("upgradeneeded", () => {
      const value = request.result;
      if (!value.objectStoreNames.contains(legacyStore)) value.createObjectStore(legacyStore);
      if (!value.objectStoreNames.contains(sessionStore)) value.createObjectStore(sessionStore);
      if (!value.objectStoreNames.contains(artStore)) value.createObjectStore(artStore);
      if (!value.objectStoreNames.contains(embedStore)) value.createObjectStore(embedStore);
    });
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error ?? new Error("Could not open the Unicode art cache.")), { once: true });
  });
  return dbPromise;
};

const done = (transaction: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
  transaction.addEventListener("complete", () => resolve(), { once: true });
  transaction.addEventListener("abort", () => reject(transaction.error ?? new Error("Unicode art cache transaction aborted.")), { once: true });
  transaction.addEventListener("error", () => reject(transaction.error ?? new Error("Unicode art cache transaction failed.")), { once: true });
});

const result = <T>(request: IDBRequest): Promise<T | undefined> => new Promise((resolve, reject) => {
  request.addEventListener("success", () => resolve(request.result as T | undefined), { once: true });
  request.addEventListener("error", () => reject(request.error ?? new Error("Could not read the Unicode art cache.")), { once: true });
});

const textFromMasks = (masks: Uint8Array, columns: number, rows: number): string => {
  const lines = new Array<string>(rows);
  for (let y = 0; y < rows; y += 1) {
    let line = "";
    const offset = y * columns;
    for (let x = 0; x < columns; x += 1) line += String.fromCodePoint(0x2800 + (masks[offset + x] ?? 0));
    lines[y] = line;
  }
  return lines.join("\n");
};

const restoreArt = (bytes: Uint8Array, meta: ArtMeta): Art => {
  const packed = unpackBoundedRaw(bytes);
  if (packed.columns !== meta.columns || packed.rows !== meta.rows) throw new Error("Cached Unicode art dimensions do not match its metadata.");
  return {
    text: textFromMasks(packed.masks, packed.columns, packed.rows),
    columns: meta.columns,
    rows: meta.rows,
    dotsWidth: meta.dotsWidth,
    dotsHeight: meta.dotsHeight,
    threshold: meta.threshold,
    density: meta.density,
    ...(packed.cellColours ? { cellColours: packed.cellColours } : {}),
  };
};

export const storeCachedArt = async (
  version: string,
  id: string,
  source: Blob | string,
  name: string,
  cfg: ArtCfg,
  paths: number,
  rectangles: number,
  art: Art,
  payload: Blob,
): Promise<void> => {
  const record: SessionRecord = {
    version,
    id,
    name,
    source,
    cfg,
    paths,
    rectangles,
    art: {
      columns: art.columns,
      rows: art.rows,
      dotsWidth: art.dotsWidth,
      dotsHeight: art.dotsHeight,
      threshold: art.threshold,
      density: art.density,
    },
  };
  const value = await db();
  const transaction = value.transaction([sessionStore, artStore, embedStore], "readwrite");
  transaction.objectStore(sessionStore).put(record, latestKey);
  transaction.objectStore(artStore).put(payload, latestKey);
  transaction.objectStore(embedStore).delete(latestKey);
  await done(transaction);
};

export const storeCachedEmbed = async (version: string, id: string, html: string): Promise<void> => {
  const record: EmbedRecord = { version, id, html: new Blob([html], { type: "text/html;charset=utf-8" }) };
  const value = await db();
  const transaction = value.transaction(embedStore, "readwrite");
  transaction.objectStore(embedStore).put(record, latestKey);
  await done(transaction);
};

export const clearCachedArt = async (): Promise<void> => {
  const value = await db();
  const transaction = value.transaction([sessionStore, artStore, embedStore], "readwrite");
  transaction.objectStore(sessionStore).delete(latestKey);
  transaction.objectStore(artStore).delete(latestKey);
  transaction.objectStore(embedStore).delete(latestKey);
  await done(transaction);
};

export const loadCachedArt = async (version: string): Promise<RestoredArt | null> => {
  // Keep the marker alive through the dangerous startup window. If the page process dies while
  // rendering/rebuilding a large cached result, the next load drops the snapshot instead of
  // attempting it forever. A page that remains alive clears the marker after the restore settles.
  if (!beginCacheRestore(version)) {
    await clearCachedArt().catch(() => {});
    return null;
  }

  try {
    const value = await db();
    const transaction = value.transaction([sessionStore, artStore, embedStore], "readonly");
    const sessionRequest = transaction.objectStore(sessionStore).get(latestKey);
    const artRequest = transaction.objectStore(artStore).get(latestKey);
    const embedRequest = transaction.objectStore(embedStore).get(latestKey);
    const [session, rawBlob, cachedEmbed] = await Promise.all([
      result<SessionRecord>(sessionRequest),
      result<Blob>(artRequest),
      result<EmbedRecord>(embedRequest),
    ]);
    await done(transaction);
    if (!session || session.version !== version || !rawBlob) {
      finishCacheRestore(version);
      return null;
    }
    const art = restoreArt(new Uint8Array(await rawBlob.arrayBuffer()), session.art);
    const embed = cachedEmbed?.version === version && cachedEmbed.id === session.id ? await cachedEmbed.html.text() : undefined;
    setTimeout(() => finishCacheRestore(version), restoreSettleMs);
    return {
      id: session.id,
      name: session.name,
      source: session.source,
      cfg: session.cfg,
      paths: session.paths,
      rectangles: session.rectangles,
      art,
      ...(embed !== undefined ? { embed } : {}),
    };
  } catch (error) {
    finishCacheRestore(version);
    throw error;
  }
};
