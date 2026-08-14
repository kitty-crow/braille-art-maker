# CLI

```bash
bun run cli -- image.png
bun run cli -- image.png --colour -o image.txt
bun run cli -- image.png --colour-background -o image.txt
bun run cli -- image.png --full-colour --html -o image.html
bun run cli -- image.png --full-colour --ansi
```

`--full-colour` implies foreground and background colour. `--colour-background` implies colour. Ordered 4x4 dithering and inverted polarity are the monochrome defaults.

Tagged TXT can be rendered with `extras/term/unicode-colour-view.c`.
