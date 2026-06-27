# WU-OPTION-B-001b: Sidecar S2-4 kernel-write guards

**Parent:** WU-OPTION-B-001  
**Decision:** A + 001b (human, ship stage)

## Problem

Review major: delete and folder move still wrote to embedded kernel in sidecar mode.

## Fix

- Delete → `mut.remove()` on sidecar via `useSidecarPage.remove` / `useSidecarPageEditor.removePage`
- Folder picker hidden in sidecar mode; move/create guarded with info toast (kernel-only metadata until Phase 2)

## AC

- S2-4: no kernel `deletePage` / `moveToFolder` on page route when `TRELLIS_SIDECAR=1`
