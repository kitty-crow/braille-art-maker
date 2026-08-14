import { embedCodec } from "../embed/codec.ts";
import { packEmbedSmall } from "../embed/small-browser.ts";
import { Tpl } from "../embed/tpl.ts";
import type { EmbedSurface, EmbedTheme, EmbedTpl } from "../embed/types.ts";
import type { Art, ArtCfg } from "../types.ts";

const fill = new Tpl();
const tpl: EmbedTpl = { html: __EMBED_HTML__ };

export const embedHtml = async (
  art: Art,
  cfg: ArtCfg,
  theme: EmbedTheme = "auto",
  surface: EmbedSurface = "auto",
): Promise<string> => fill.make({
  data: await packEmbedSmall(art, cfg),
  codec: embedCodec,
  theme,
  surface,
  src: __EMBED_SRC__,
}, tpl);
