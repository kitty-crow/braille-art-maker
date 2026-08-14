# API

`makeArt(pixels, cfg)` returns Unicode Braille plus optional per-cell foreground/background colours.

Colour fields in `ArtCfg`:

```ts
colour?: boolean
colourBackground?: boolean
fullColour?: boolean
```

`taggedText(art)` serialises colour cells as `<#rrggbb>` / `<@#rrggbb>` tags. `taggedToAnsi(text)` converts the tag format to terminal truecolour escapes. `denseHtml(art)` emits self-contained coloured HTML.
