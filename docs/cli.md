# CLI

```bash
bun run cli -- image.png
bun run cli -- image.png --colour -o image.txt
bun run cli -- image.png --full-colour --html -o image.html
bun run cli -- image.png --full-colour --ansi
bun run cli -- image.png --colour --embed -o image-embed.html
```

`--colour` is foreground-only colour. `--full-colour` implies foreground and background colour and enables the adaptive two-colour cell representation. The older `--colour-background` flag remains accepted for backwards compatibility but is no longer a recommended colour mode. Ordered 4x4 dithering and inverted polarity are the core CLI defaults.

Embedding options:

```text
--embed
--embed-src URL
--embed-theme auto|light|dark
--embed-surface auto|light|dark
```

`--embed-src` points at `embed.js`; sibling `embed.css` and `load.js` URLs are derived automatically.

Tagged TXT can be rendered with `extras/term/unicode-colour-view.c`.