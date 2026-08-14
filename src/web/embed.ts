import { embedCodec, packEmbed } from "../embed/codec.ts";
import { Tpl } from "../embed/tpl.ts";
import type { EmbedSurface, EmbedTheme, EmbedTpl } from "../embed/types.ts";
import type { Art, ArtCfg } from "../types.ts";

const fill = new Tpl();
const tpl: EmbedTpl = { html: __EMBED_HTML__ };

export const embedHtml = (
  art: Art,
  cfg: ArtCfg,
  theme: EmbedTheme = "auto",
  surface: EmbedSurface = "auto",
): string => fill.make({
  data: packEmbed(art, cfg, embedCodec),
  codec: embedCodec,
  theme,
  surface,
  src: __EMBED_SRC__,
}, tpl);
