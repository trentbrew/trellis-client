# WU-STUDIO-005: Global workspace registry migration to ~/.trellis

## Purpose

Move project and workspace tracking to Trellis-owned global state under `~/.trellis` instead of app-specific `~/.turtlecode` storage.

## Scope

- Define the `~/.trellis` global directory layout.
- Add a workspace registry file or graph-backed registry strategy.
- Read `~/.trellis` first and fall back to `~/.turtlecode` during migration.
- Migrate existing known workspaces without deleting legacy state.
- Update Studio and CLI project pickers to use the new source.

## Proposed Layout

```text
~/.trellis/
  context.json
  workspaces.json
  cache/
  bins/
  studio/
  logs/
```

Repo-local `.trellis/` remains project state and should not be edited manually.

## Acceptance Criteria

- Existing `~/.turtlecode` project listings still appear after migration.
- New projects are registered in `~/.trellis`.
- CLI and Studio agree on the same workspace registry.
- Migration is idempotent and non-destructive.
- Tests cover missing files, invalid JSON, duplicate paths, and removed directories.
