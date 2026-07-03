# WU-STUDIO-006: Project init justfile scaffolding

## Purpose

Include a useful `justfile` in newly initialized Trellis projects so common commands are discoverable and repeatable.

## Scope

- Add `trellis init --justfile` and `trellis init --no-justfile` behavior.
- Generate a minimal, adaptive `justfile` for new projects.
- Detect existing package manager and scripts.
- Never overwrite an existing `justfile` without explicit confirmation.
- Document common Trellis recipes.

## Candidate Recipes

```just
studio:
  trellis studio

doctor:
  trellis doctor

status:
  trellis status

issues:
  trellis issue list

dev:
  bun run dev

test:
  bun test

lint:
  bun run lint
```

Recipes should adapt to actual project scripts and package manager.

## Acceptance Criteria

- New Trellis projects can include a generated `justfile`.
- Existing `justfile` is preserved by default.
- Generated recipes reflect available `package.json` scripts.
- Documentation explains customization and opt-out.
- Init tests cover new file, existing file, Bun project, and npm-compatible project cases.
