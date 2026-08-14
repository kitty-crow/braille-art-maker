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

`packEmbedSmall(art, cfg)` creates the current `u4` payload. It searches multiple exact mask and colour representations, compares raw, maximum-DEFLATE and Brotli-11 transports within a bounded search budget, and emits the shortest result as safe ASCII basE91. `unpackEmbedSmall(data, codec)` decodes `u4` and remains compatible with `u1`, `u2` and `u3`.
