# Documentation rules for implementation work

When the implementation is restored, documentation must be updated in the same change whenever public behaviour changes.

In particular:

- keep `README.md` commands executable
- keep `docs/algorithm.md` consistent with actual defaults and supported dithers
- keep `docs/web.md` consistent with the live hero and accessibility behaviour
- keep `docs/cli.md` consistent with accepted flags and output formats
- update pinned dependency SHAs and ownership boundaries in `docs/dependencies.md`
- remove `docs/status.md` only after the implementation and Pages deployment have been independently verified on `main`

Do not copy documentation from `vendor/pages` into the project root. Shared Pages-template documentation belongs in the submodule.
