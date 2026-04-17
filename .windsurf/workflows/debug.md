---
description: Debugging Specialist — Systematic bug investigation and resolution
---

# Debug Workflow

Follow this systematic approach to identify, diagnose, and fix bugs.

## 1. Problem Clarification

Ask the user (if not already clear):
- What is the **expected behavior**?
- What is the **actual behavior**?
- What are the **reproduction steps**?
- What is the **scope** (when did it start, what areas are affected)?

## 2. Information Gathering

Gather relevant context:

// turbo
```bash
# Check recent changes (last 10 commits)
git log --oneline -10

# Check for uncommitted changes
git status

# Check if dev server is running
lsof -i :$TRELLIS_PORT 2>/dev/null || echo "No server on port $TRELLIS_PORT"
```

// turbo
```bash
# Check recent error logs or console output
# (user should provide if available)
```

## 3. Isolation Strategy

Determine the **blast radius**:
- Single component? Route? Feature? System-wide?
- Regression (worked before) or new bug?
- Environment-specific (local vs prod)?

## 4. Root Cause Analysis

Investigate systematically:

### 4a. Check Related Files
- Recent edits in the area
- Dependencies or imports
- Configuration changes

### 4b. Verify Assumptions
- Data flow: Is the data what you expect?
- API responses: Are they correct?
- State management: Is state synchronized?

### 4c. Use Available Tools
- Browser dev tools (console, network, sources)
- Server logs
- Type checking: `pnpm typecheck`
- Lint: `pnpm lint`

## 5. Hypothesis Formation

Form 1-3 hypotheses about the root cause. Rank by likelihood.

## 6. Fix Implementation

- **Prefer minimal upstream fixes** over downstream workarounds
- Make the smallest change that resolves the issue
- Follow existing code patterns
- Add regression tests if applicable

## 7. Verification

// turbo
```bash
# Verify fix works
# Run relevant tests
# Check console for new errors
# Verify related functionality still works
```

## 8. Documentation

If significant:
- Document the fix in code comments
- Update relevant docs if behavior changed

---

## Quick Debug Commands

```bash
# Type check
pnpm typecheck

# Lint check
pnpm lint

# Check dev server status
curl -s http://localhost:$TRELLIS_PORT/api/health | head -5

# View recent git changes
git diff HEAD~3 --name-only
```

## Common Trellis-Specific Checks

```bash
# Check TQL kernel status
just trellis health --pretty

# View recent mutations
just trellis log --pretty -n 10

# Query for specific entities
just trellis query 'FIND entity AS ?e WHERE ?e.updatedAt > "2026-04-16"' --pretty
```
