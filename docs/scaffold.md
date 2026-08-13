# Scaffold

```bash
bun vendor/pages/src/cli.ts init . \
  --name "Project" \
  --repo owner/project \
  --base /project/
```

Options:

- `--kofi <user>` enables the shared Ko-fi runtime
- `--force` replaces existing scaffold files

The starter is deliberately neutral. It does not provide a logo, favicon, author, legal wording or application description. Add those in the consuming project.

The generated About page is client-facing. The README page is developer-facing and renders the repository README.
