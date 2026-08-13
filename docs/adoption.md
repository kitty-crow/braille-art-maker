# Adoption

The template is designed to preserve an existing Pages application before reducing duplication.

## 1. Pin the dependency

Add the repository as a submodule and commit the exact pointer.

```bash
git submodule add https://github.com/kitty-crow/github-pages-template vendor/pages
git -C vendor/pages checkout <commit-sha>
```

## 2. Record the current output

Build the existing site and keep its generated file tree, routes and visual references. The first template build should match these before any redesign or class renaming.

## 3. Map existing pages

Set `source`, `out` and `pages` to the current authored files. `copySource: true` retains application assets. Clean routes can be introduced while legacy `.html` files redirect.

## 4. Adopt behaviour independently

Enable one runtime feature at a time:

1. theme boot and controls
2. version loader
3. Ko-fi runtime and CSS
4. README renderer
5. route compilation

Selectors adapt the shared runtime to existing markup. No shared shell class is required.

## 5. Keep project CSS

Start with no shared CSS, or include only isolated concerns. Existing stylesheets remain authoritative. Shared component styles can be adopted later by adding `pages-*` classes alongside current classes.

## 6. Remove duplicates after parity

Delete local theme, Ko-fi, version or README code only after output routes, desktop layout, mobile layout, light theme, dark theme and interactive state match the previous deployment.

The submodule must never absorb application logic. It owns only the GitHub Pages shell, runtime helpers, shared presentation primitives and build/deploy plumbing.
