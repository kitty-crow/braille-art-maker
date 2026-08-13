# Submodule use

A parent repository stores one exact template commit.

```bash
git submodule add https://github.com/kitty-crow/github-pages-template vendor/pages
git -C vendor/pages checkout <commit-sha>
git add .gitmodules vendor/pages
```

CI checkout must include submodules:

```yaml
- uses: actions/checkout@v6
  with:
    submodules: recursive
```

Build through the local path:

```bash
bun vendor/pages/src/cli.ts check pages.config.ts
bun vendor/pages/src/cli.ts build pages.config.ts
```

## Update

```bash
git -C vendor/pages fetch origin
git -C vendor/pages checkout <new-commit-sha>
git add vendor/pages
```

Review and test the pointer update like any other dependency change. Do not track the template branch implicitly.
