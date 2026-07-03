# WU-STUDIO-004: NixOS one-shot install and build support

## Purpose

Make NixOS users able to install or run Trellis Studio in one shot with reproducible dependency resolution.

## Scope

- Provide a flake package for desktop Studio.
- Provide a flake app runnable with `nix run`.
- Provide a dev shell for building the Tauri app locally.
- Ensure Tauri system dependencies are resolved through Nix.
- Teach `trellis studio --desktop` to detect NixOS and recommend or invoke the Nix path.

## Proposed Commands

```bash
nix run github:turtleos/trellis#studio
nix profile install github:turtleos/trellis#studio
nix develop github:turtleos/trellis#desktop-dev
```

## Acceptance Criteria

- `nix flake check` passes for supported systems.
- `nix run .#studio` launches or installs the desktop Studio from the repo checkout.
- Tauri build dependencies are declared in `flake.nix`.
- `trellis studio --desktop` detects NixOS and prints the Nix-native command.
- Documentation names NixOS as a first-class supported install path.
