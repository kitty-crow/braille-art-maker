import { taggedText } from "../colour/tagged.ts";
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
  payload: {
    text: art.cellColours ? taggedText(art) : art.text,
    columns: art.columns,
    rows: art.rows,
    colour: cfg.colour === true,
    colourBackground: cfg.colourBackground === true,
    fullColour: cfg.fullColour === true,
  },
  theme,
  surface,
  src: __EMBED_SRC__,
}, tpl);
