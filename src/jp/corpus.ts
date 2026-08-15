export interface CorpusEntry {
  readonly id: string;
  readonly text: string;
  readonly kind: "noun" | "person" | "place" | "object" | "verb" | "adjective" | "connector" | "dialogue";
  readonly tags: readonly string[];
}

export interface CorpusPack {
  readonly id: string;
  readonly version: 1;
  readonly entries: readonly CorpusEntry[];
}

const attrs = (source: string): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const match of source.matchAll(/([\w-]+)="([^"]*)"/gu)) out[match[1]!] = match[2]!;
  return out;
};

const unescapeXml = (source: string): string => source
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">")
  .replaceAll("&quot;", '"')
  .replaceAll("&apos;", "'")
  .replaceAll("&amp;", "&");

export const parseCorpusXml = (source: string): CorpusPack => {
  const root = source.match(/<corpus\b([^>]*)>/u);
  if (!root) throw new Error("Japanese corpus is missing <corpus> root.");
  const rootAttrs = attrs(root[1] ?? "");
  if (!rootAttrs.id) throw new Error("Japanese corpus id is missing.");
  if (rootAttrs.version !== "1") throw new Error("Unsupported Japanese corpus version.");

  const entries: CorpusEntry[] = [];
  for (const match of source.matchAll(/<entry\b([^>]*)>([\s\S]*?)<\/entry>/gu)) {
    const meta = attrs(match[1] ?? "");
    const kind = meta.kind as CorpusEntry["kind"] | undefined;
    if (!meta.id || !kind) throw new Error("Japanese corpus entry metadata is incomplete.");
    if (!["noun", "person", "place", "object", "verb", "adjective", "connector", "dialogue"].includes(kind)) {
      throw new Error(`Unsupported Japanese corpus entry kind: ${kind}`);
    }
    const text = unescapeXml((match[2] ?? "").trim());
    if (!text) throw new Error(`Japanese corpus entry ${meta.id} is empty.`);
    entries.push({ id: meta.id, text, kind, tags: (meta.tags ?? "").split(",").map(value => value.trim()).filter(Boolean) });
  }
  if (entries.length === 0) throw new Error("Japanese corpus contains no entries.");
  return { id: rootAttrs.id, version: 1, entries };
};
