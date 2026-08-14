# API

`makeArt(pixels, cfg)` returns Unicode text plus optional per-cell foreground/background colours.

Colour fields in `ArtCfg`:

```ts
colour?: boolean
colourBackground?: boolean
fullColour?: boolean
```

`packUnicode(dots, width, height)` packs a 2x4 dot grid into Unicode cells. `taggedText(art)` serialises colour cells as `<#rrggbb>` / `<@#rrggbb>` tags. `taggedToAnsi(text)` converts the tag format to terminal truecolour escapes. `denseHtml(art)` emits self-contained coloured HTML.

`packEmbed(art, cfg)` creates the compact versioned `u1` embed payload. It stores one 8-bit mask per Unicode cell, applies run-length packing and colour-state compression, then returns safe base64url. `unpackEmbed(data)` reverses the format and returns dimensions, masks, colour-mode flags and per-cell colours.
