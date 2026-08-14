# CLI

```bash
bun run cli -- image.png
bun run cli -- image.png --colour -o image.txt
bun run cli -- image.png --colour-background -o image.txt
bun run cli -- image.png --full-colour --html -o image.html
bun run cli -- image.png --full-colour --ansi
bun run cli -- image.png --colour --embed -o image-embed.html
```

`--full-colour` implies foreground and background colour. `--colour-background` implies colour. Ordered 4x4 dithering and inverted polarity are the core CLI defaults.

Embedding options:

```text
--embed
--embed-src URL
--embed-theme auto|light|dark
--embed-surface auto|light|dark
```

`--embed-src` points at `embed.js`; sibling `embed.css` and `load.js` URLs are derived automatically.

Tagged TXT can be rendered with `extras/term/unicode-colour-view.c`.
