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

`packEmbedSmall(art, cfg, story?)` creates a `u4` payload. By default it searches multiple exact mask and colour representations, compares raw, maximum-DEFLATE and Brotli-11 candidates within a bounded search budget, then chooses the shorter safe basE91/J8192 transport. Passing `true` for `story` encodes the selected compressed bytes as the reversible single-line Japanese **Payload as a story** representation instead. `unpackEmbedSmall(data, codec)` decodes both forms and remains compatible with earlier `u1`, `u2`, `u3` and `u4` transports.
