# Runtime

The builder compiles one project-specific browser runtime from the pinned template source. Features that are absent from the configuration are not initialised.

## Theme

```ts
theme: {
  key: "project.theme",
  colours: {
    light: "#f5f6f8",
    dark: "#11131a"
  },
  toggle: "[data-theme-toggle]",
  label: "[data-theme-label]",
  event: "project:theme"
}
```

The boot bundle runs in `<head>` before CSS, reads the saved value or operating-system preference, and sets `data-theme`. The runtime binds controls and follows later OS changes until the user stores an override.

## Ko-fi

```ts
kofi: {
  user: "account",
  header: ".header",
  footer: ".footer-links"
}
```

The header selector is used to position the overlay below a sticky header. The footer selector is optional. Styling lives in `kofi.css`; runtime TypeScript does not inject CSS.

## Version

```ts
version: {
  file: "version.json",
  selector: "[data-version]",
  prefix: "v"
}
```

The file is resolved from `runtime.base`, so nested clean routes read the same source.

## README

```ts
readme: {
  owner: "owner",
  repo: "project",
  branch: "main",
  path: "README.md",
  content: "#readme-content",
  status: "#readme-status"
}
```

Marked, DOMPurify and Highlight.js are loaded only on pages containing the configured elements. Relative links and images are rewritten to the repository branch.
