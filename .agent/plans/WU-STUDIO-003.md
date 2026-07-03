# WU-STUDIO-003: Desktop Studio install and launch flow

## Purpose

Support `trellis studio --desktop` as the one-command path for installing or launching the Tauri desktop Studio.

## Scope

- Detect installed desktop app by platform.
- Download the correct signed artifact for macOS, Windows, and Linux.
- Install into the expected user/application location.
- Launch the app after install unless `--no-launch` is set.
- Support `--update`, `--channel`, and `--no-launch` if release metadata supports them.

## Platform Targets

- macOS: `.dmg` or `.app.tar.gz` artifact.
- Windows: `.msi` or `.exe` artifact.
- Linux generic: AppImage, deb, or rpm artifact.
- NixOS: delegate to WU-STUDIO-004.

## Acceptance Criteria

- `trellis studio --desktop` launches when installed.
- Missing desktop app triggers artifact selection and install flow.
- Install path is documented per platform.
- Failed downloads leave no corrupt partial install.
- Smoke validation covers artifact URL resolution and launch command construction.
