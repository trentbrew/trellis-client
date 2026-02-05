## High-leverage principle: reduce “implicit magic” and increase “inspectability”

LLMs/agents do best when the codebase has:

- **Clear entry points**
- **Few hidden conventions**
- **Typed/validated data boundaries**
- **Deterministic workflows**
- **Fast, trustworthy verification loops**

Below are concrete strategies that usually move the needle immediately, especially for a Nuxt/Vue + TS app like yours.

---

## 1) Make the architecture legible in 60 seconds

- **Create/maintain a single “map of the repo” doc** (1 page max):
  - **What boots the app**
  - **Where routing lives**
  - **Where data fetching lives**
  - **Where state lives**
  - **Where schema/types live**
  - **Where server APIs live**
- **Define module boundaries explicitly**
  - Example: “Pages are orchestration only; business logic lives in `app/composables/*` or `server/utils/*`; pure transforms in `app/lib/*`.”

Practical guideline:

- **Pages/components should mostly wire things together.**
- **Non-UI logic should be extractable and unit-testable without Nuxt runtime.**

---

## 2) Reduce “Nuxt/Vue implicitness” (or document it aggressively)

Nuxt auto-imports and convention-based wiring are great for humans _who already know the conventions_, but can be costly for agents.

Options:

- **Prefer explicit imports for critical logic** (even if Nuxt allows auto-import).
- **Centralize “magic” in a small number of patterns**
  - e.g. always use one fetch wrapper, one logging wrapper, one error wrapper.
- **Document your conventions with examples**
  - “When you see `useX()`, it lives in `app/composables/useX.ts` unless noted.”
  - “All server endpoints live under `server/api/**` and return `{ data, error }`.”

---

## 3) Make data boundaries typed + validated (agents need contracts)

- **Treat everything crossing boundaries as untrusted**
  - URL params, query strings, API payloads, DB records.
- **Use a runtime validator (Zod, Valibot, etc.) at boundaries**
  - Agents are much better at refactoring when schemas are enforced and failures are explicit.
- **Co-locate types with schemas**
  - Avoid “type-only truth” that can drift from runtime.

This pays off in:

- Faster debugging (errors point to boundary violations)
- Safer refactors (tests + validators catch regressions)

---

## 4) Make state and side effects observable

Agents struggle when state changes are “somewhere in the UI.”

Do:

- **Name your state stores/events clearly**
  - “selectedFacilityId” beats “facility”
- **Log structured events in dev**
  - e.g. `event: 'TASK_SAVED', org, year, facility, taskId`
- **Add “debug panels”/dev-only overlays**
  - Display key route params, loaded entities, pending network requests, feature flags.

On the server:

- **Add request IDs and log them**
- **Log the _shape_ of inputs (not secrets) and key decisions**
  - “Matched schedule rule X because …”

---

## 5) Standardize workflows into a few canonical commands

Agents iterate best when they can run a small set of reliable commands and interpret results.

Aim for:

- **One command to run the app**
- **One command to run unit tests**
- **One command to run e2e**
- **One command to lint/typecheck**
- **One command to run “full verification”**

If there’s any ambiguity (and your repo currently has both lockfiles), pick a single package manager and make it unequivocal:

- **Use one lockfile**
- **Put the blessed commands in the README and keep them accurate**
- Consider a `justfile`/Makefile as the single interface.

---

## 6) Create “golden paths” (happy-path fixtures + seeds)

Agents are dramatically more effective when there is:

- **A known-good dataset/seed**
- **A small number of canonical user flows**
  - “Create space -> create task -> see it in list”
- **Recorded expectations**
  - e2e tests, screenshots, or even “verify checklist” outputs

This makes it easier to:

- Reproduce bugs
- Validate refactors quickly
- Avoid “it works on my machine” drift

---

## 7) Prefer pure functions + small files for non-UI logic

When logic lives in a 600+ line page component, agents can still help, but:

- They’ll propose riskier edits
- They’ll miss subtle coupling

Refactor target:

- **Extract transforms and calculations into pure functions**
- **Keep page components thin**
- **Keep composables single-purpose**
- **Avoid circular dependencies**

---

## 8) Upgrade error messages from “what happened” to “what to do”

For both humans and agents:

- Use invariant-style errors:
  - What was expected
  - What was received
  - What to check next (route params, schema version, missing seed, etc.)

This reduces “search time” more than almost anything else.

---

## 9) Add an “Agent Runbook” (tiny but powerful)

A short `docs/AGENTS.md` (or similar) that includes:

- **Repo map**
- **Canonical commands**
- **Where to add features**
- **Where to put tests**
- **How to debug**
- **Common pitfalls (“Nuxt auto-imports X”, “route params are validated here”, etc.)**

This is essentially “tooling for LLM cognition.”

---

## If you want, I can make this concrete in _your_ repo

If you tell me “focus on navigation/debuggability” or “focus on agent iteration speed,” I can scan the codebase and propose **3-5 specific refactors** (e.g. breaking up that `tasks.vue` page into composables + pure functions, adding a single fetch/logging boundary, and adding a canonical verification command) with minimal disruption.

## Status

- **Provided** a set of actionable, repo-friendly strategies to improve navigation, understanding, debug-ability, and iteration speed for LLMs/agents.
- **No code changes made** (yet).
