import { embedCodec } from "../embed/codec.ts";
import { packEmbedSmall } from "../embed/small-browser.ts";
import { Tpl } from "../embed/tpl.ts";
import type { EmbedSurface, EmbedTheme, EmbedTpl } from "../embed/types.ts";
import type { PackProgress } from "../embed/ultra-search.ts";
import type { Art, ArtCfg } from "../types.ts";

interface Request {
  readonly id: number;
  readonly art: Art;
  readonly cfg: ArtCfg;
  readonly theme: EmbedTheme;
  readonly surface: EmbedSurface;
}

interface Response {
  readonly id: number;
  readonly html?: string;
  readonly progress?: PackProgress;
  readonly error?: string;
}

const fill = new Tpl();
const tpl: EmbedTpl = { html: __EMBED_HTML__ };

self.addEventListener("message", event => {
  const request = event.data as Request;
  void (async () => {
    try {
      const data = await packEmbedSmall(request.art, request.cfg, progress => {
        self.postMessage({ id: request.id, progress } satisfies Response);
      });
      const html = fill.make({
        data,
        codec: embedCodec,
        theme: request.theme,
        surface: request.surface,
        src: __EMBED_SRC__,
      }, tpl);
      self.postMessage({ id: request.id, html } satisfies Response);
    } catch (error) {
      self.postMessage({
        id: request.id,
        error: error instanceof Error ? error.message : String(error),
      } satisfies Response);
    }
  })();
});
