# GitHub Pages Template

Unbranded GitHub Pages build, runtime and component foundation for static web applications.

It covers Pages concerns only. Application logic, domain code, page content, project branding and project-specific CSS remain in the consuming repository.

## Use as a pinned submodule

```bash
git submodule add https://github.com/kitty-crow/github-pages-template vendor/pages
git -C vendor/pages checkout <commit-sha>
git add .gitmodules vendor/pages
```

The parent repository records the exact template commit. Updating the shared layer is an explicit submodule pointer change.

## Commands

```bash
bun vendor/pages/src/cli.ts check pages.config.ts
bun vendor/pages/src/cli.ts build pages.config.ts
bun vendor/pages/src/cli.ts version patch
```

Create a neutral starter:

```bash
bun vendor/pages/src/cli.ts init . \
  --name "Project" \
  --repo owner/project \
  --base /project/
```

The scaffold contains separate Home, About, README and 404 pages, clean routes, version loading, theme controls, responsive shell styles and Pages workflows. Ko-fi is disabled unless `--kofi <user>` is supplied.

## Configuration

```ts
import { definePages } from "./vendor/pages/src/index.ts";

export default definePages({
  source: "web",
  out: "site",
  pages: [
    { from: "index.html", route: "/" },
    { from: "about.html", route: "/about/", legacy: ["about.html"] },
    { from: "readme.html", route: "/readme/", legacy: ["readme.html"] }
  ],
  runtime: {
    base: "/project/",
    theme: {
      key: "project.theme",
      colours: { light: "#f5f6f8", dark: "#11131a" }
    },
    version: { file: "version.json" },
    readme: { owner: "owner", repo: "project" }
  }
});
```

See [Configuration](docs/config.md).

## Shared Pages elements

- early theme boot with OS preference detection and persisted override
- generic light/dark controls and optional theme events
- responsive Ko-fi overlay placement and footer link
- version text loaded from an independent JSON file
- sanitised README rendering with link and image rewriting
- clean-route compilation and optional legacy redirects
- `.nojekyll`, 404 and Pages artefact support
- neutral shell, navigation, field, button, panel, footer and Markdown styles
- reusable and copyable GitHub Actions workflows

Every runtime feature is optional. Selectors, storage keys, colours, repository details and donation account are supplied by the consuming project.

## CSS

Shared CSS is stored under `web/styles/`, separated by concern, strongly indented and written with native `&` nesting. `web/styles.css` is the complete index.

Consumers select only the files they need. Project CSS remains local and loads after the shared layer, so an existing visual state can be retained exactly.

See [CSS](docs/css.md).

## Existing sites

Adoption is parity-first. Keep the current HTML and CSS, add the submodule, compile only the shared runtime pieces needed, and remove duplicated code after the built output matches the current site.

See [Adoption](docs/adoption.md) and [Submodules](docs/submodule.md).

## Workflows

The repository includes reusable `pages.yml` and `version.yml` workflows. The scaffold also contains standalone workflows that call the pinned local submodule. Version commits use `[skip ci]` so the version workflow can deploy without triggering a second Pages run.

See [Workflows](docs/workflows.md).

## Project layout

```text
src/          strict TypeScript builder, CLI and browser runtime
web/styles/   optional concern-separated shared CSS
scaffold/     neutral starter copied by the init command
docs/         adoption and implementation documentation
tests/        Bun tests
example/      buildable neutral example
```

## Author

Kitty Crow  
https://kittycrow.dev

## Licence

[MIT](LICENSE)
