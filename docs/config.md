# Configuration

`pages.config.ts` exports a value created with `definePages`.

## Build paths

- `source`: authored Pages directory
- `out`: generated Pages directory
- `assets`: generated shared asset directory; defaults to `assets/pages`
- `clean`: clear `out` before building; defaults to `true`
- `copySource`: copy the complete source tree before page mapping; defaults to `true`
- `copy`: extra files or directories copied from the project root
- `noJekyll`: write `.nojekyll`; defaults to `true`
- `minify`: minify generated browser runtime files; defaults to `true`

## Pages

```ts
pages: [
  {
    from: "about.html",
    route: "/about/",
    legacy: ["about.html"],
    baseHref: "../"
  }
]
```

`route` controls the output path. `/about/` becomes `about/index.html`. A route ending in `.html` remains a file.

`legacy` creates redirect files for old URLs. `keepSource` retains the copied source file when its output route differs. `inject: false` disables runtime and shared-style injection for one page.

`baseHref` inserts or replaces the page's `<base href>` before other head content. It is useful when the same authored page is emitted both as a root `.html` file and as a clean nested route.

Use these markers to control injection position:

```html
<!-- pages:head -->
<!-- pages:body -->
```

Without markers, tags are inserted before `</head>` and `</body>`.

## Runtime

`runtime.base` is the deployed Pages base, such as `/project/` or a full custom-domain URL.

Runtime sections are optional:

- `theme`: OS preference, persisted override and toggle controls
- `kofi`: responsive overlay and optional footer link
- `version`: version JSON loader
- `readme`: GitHub README renderer

See [Runtime](runtime.md).

## CSS

```ts
css: {
  files: ["kofi.css", "markdown.css"],
  vars: {
    "--pages-accent": "#5263d9"
  },
  dark: {
    "--pages-accent": "#9ba5ff"
  }
}
```

Only named shared files are copied and injected. Local project styles remain separate.
