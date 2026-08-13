# CSS

The shared stylesheet source is under `web/styles/`.

```text
tokens.css
type.css
base.css
shell.css
nav.css
theme.css
panel.css
field.css
button.css
footer.css
kofi.css
markdown.css
util.css
responsive.css
```

Files are readable source, not minified output. Selectors use native nesting and the `pages-` prefix. Variables use `--pages-*`.

The complete source index is `web/styles.css`. Consumer builds normally select a subset in `pages.config.ts`; the builder creates a smaller output index containing only those files.

## Existing projects

Do not replace project styling during adoption. Begin with behaviour-only runtime or isolated files such as `kofi.css` and `markdown.css`. Keep project styles after the shared stylesheet so current values and selectors win.

When a common component is moved into the shared layer, add the neutral `pages-*` class or data attribute without removing the existing project class. Remove the old rules only after visual parity is confirmed.
