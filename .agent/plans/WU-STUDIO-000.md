# WU-STUDIO-000: Trellis Studio install and workspace foundations

## Purpose

Define and coordinate the Trellis Studio installation, desktop distribution, NixOS support, workspace storage, and project scaffolding work.

## Scope

This is the parent WorkUnit for the Studio installability program. It does not directly implement features. It defines the sequencing, cross-cutting decisions, and validation gates for the child WorkUnits.

## Decisions

- `trellis studio` is the product command for launching Studio.
- `trellis web` remains compatible as an alias or lower-level implementation detail.
- `trellis studio --desktop` is the explicit desktop app install/launch path.
- `~/.trellis` is the product-owned global config and workspace registry root.
- Repo-local `.trellis/` remains project state and must stay engine-managed.
- NixOS support should be Nix-native, with `nix run` as the canonical one-shot path.
- New project `justfile` scaffolding should be non-destructive and adaptive.

## Child WorkUnits

- WU-STUDIO-001: Studio CLI command surface and dependency doctor
- WU-STUDIO-002: Automatic dependency resolution and safe installers
- WU-STUDIO-003: Desktop Studio install and launch flow
- WU-STUDIO-004: NixOS one-shot install and build support
- WU-STUDIO-005: Global workspace registry migration to `~/.trellis`
- WU-STUDIO-006: Project init `justfile` scaffolding

## Acceptance Criteria

- Child WorkUnits exist as graph entities with spec paths.
- Implementation sequence is documented.
- Validation strategy is explicit for CLI, desktop, NixOS, migration, and init scaffolding.
- No direct edits are made to `.trellis/`.
