# WU-STUDIO-002: Automatic dependency resolution and safe installers

## Purpose

Make `npx trellis studio` self-healing for common missing dependencies while avoiding surprising system mutations.

## Scope

- Detect required tools: Node, Bun, unzip, git, platform package manager, and desktop-specific tools.
- Install userland dependencies automatically where safe.
- Ask before system package installs unless `--yes` is supplied.
- Provide exact manual commands when automatic install is unavailable.
- Cache downloaded helper binaries under `~/.trellis`.

## Install Policy

- Bun may be installed into user space with clear messaging.
- `unzip` and system packages require platform-specific confirmation.
- Package-manager commands must be printed before execution.
- NixOS should prefer Nix-native flow instead of ad-hoc mutation.

## Acceptance Criteria

- Missing Bun is detected and resolved or clearly reported.
- Missing `unzip` is detected with platform-specific remediation.
- `--yes` enables non-interactive dependency installation where safe.
- `--doctor` exits non-zero when required dependencies are missing.
- Installer logic has tests for macOS, Linux, Windows, and NixOS detection.
