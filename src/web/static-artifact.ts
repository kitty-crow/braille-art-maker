import type { PackedEmbed } from "../embed/codec.ts";
import { staticPackedChunks } from "../embed/static-html.ts";

export interface StaticArtifact {
  readonly blob: Blob;
  readonly preview: string;
  readonly truncated: boolean;
}

const previewLimit = 96_000;

export const makeStaticArtifact = async (packed: PackedEmbed): Promise<StaticArtifact> => {
  const chunks = staticPackedChunks(packed)[Symbol.iterator]();
  const encoder = new TextEncoder();
  let preview = "";
  let chars = 0;

  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      const next = chunks.next();
      if (next.done) {
        controller.close();
        return;
      }
      const chunk = next.value;
      chars += chunk.length;
      if (preview.length < previewLimit) preview += chunk.slice(0, previewLimit - preview.length);
      controller.enqueue(encoder.encode(chunk));
    },
  });

  const blob = await new Response(stream, {
    headers: { "content-type": "text/html;charset=utf-8" },
  }).blob();

  return { blob, preview, truncated: chars > preview.length };
};
