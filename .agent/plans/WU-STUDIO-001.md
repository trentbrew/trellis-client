# WU-STUDIO-001: Studio CLI command surface and dependency doctor

## Purpose

Add the product-facing `trellis studio` command and dependency diagnostics needed for reliable local Studio launch.

## Scope

- Add `trellis studio` as the primary command.
- Keep `trellis web` compatible as an alias or implementation detail.
- Support `--port`, `-p`, `--no-open`, `--quiet`, `--yes`, and `--doctor` where appropriate.
- Add `trellis studio doctor` or equivalent diagnostics.
- Ensure help output explains web versus desktop paths.

## Proposed Behavior

```bash
trellis studio
trellis studio --port 1414
trellis studio --no-open
trellis studio --doctor
trellis studio --desktop
```

`trellis studio` should launch the bundled web Studio when available. It should not require source checkout dependencies unless the bundled runtime is missing or the user is in development mode.

## Acceptance Criteria

- `node packages/trellis-cli/bin/trellis.mjs studio --help` documents supported flags.
- `trellis studio --no-open --quiet` launches the bundled web runtime and probes `/api/graph/health`.
- `trellis web` still works for existing users.
- `trellis studio doctor` reports Node, Bun, unzip, git, platform, and desktop readiness.
- CLI tests or smoke scripts cover command parsing and aliases.
