# Workflows

## Standalone

The scaffold copies two workflows into the consuming repository:

- `pages.yml`: check, build, upload and deploy
- `chore.yml`: bump version, check, build, commit, tag and deploy

Both call the pinned local submodule. The version commit contains `[skip ci]`, preventing a second push-triggered Pages build.

## Reusable

This repository also exposes reusable workflows:

```yaml
jobs:
  pages:
    uses: kitty-crow/github-pages-template/.github/workflows/pages.yml@<commit-sha>
    permissions:
      contents: read
      pages: write
      id-token: write
    with:
      check-command: bun vendor/pages/src/cli.ts check pages.config.ts
      build-command: bun vendor/pages/src/cli.ts build pages.config.ts
      artifact-path: site
```

Pin reusable workflows to a commit SHA, not `main`.

The reusable version workflow accepts the same build inputs plus a version command and bump value. Standalone workflows are easier to customise when a project has additional release steps.
