# API

`makeArt(pixels, cfg)` returns Unicode text plus optional per-cell foreground/background colours.

Colour fields in `ArtCfg`:

```ts
colour?: boolean
colourBackground?: boolean
fullColour?: boolean
```

`packUnicode(dots, width, height)` packs a 2x4 dot grid into Unicode cells. `taggedText(art)` serialises colour cells as `<#rrggbb>` / `<@#rrggbb>` tags. `taggedToAnsi(text)` converts the tag format to terminal truecolour escapes. `denseHtml(art)` emits self-contained coloured HTML.
