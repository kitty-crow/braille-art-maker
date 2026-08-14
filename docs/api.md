# API

`makeArt(pixels, cfg)` returns Unicode text plus optional per-cell foreground/background colours.

Colour fields in `ArtCfg`:

```ts
colour?: boolean
colourBackground?: boolean
fullColour?: boolean
```

`packUnicode(dots, width, height)` packs a 2x4 dot grid into Unicode cells. `taggedText(art)` serialises colour cells as `<#rrggbb>` / `<@#rrggbb>` tags. `taggedToAnsi(text)` converts the tag format to terminal truecolour escapes. `denseHtml(art)` emits self-contained coloured HTML.

`packEmbed(art, cfg, codec)` and `unpackEmbed(data, codec)` retain the synchronous `u1`/`u2` compatibility API.

`packEmbedSmall(art, cfg)` creates the current `u3` embed payload. It tries multiple exact mask and colour representations, Brotli-compresses every candidate at quality 11, keeps the smallest result and emits safe ASCII base85. `unpackEmbedSmall(data, codec)` decodes `u3` and also accepts legacy `u1`/`u2` payloads.
