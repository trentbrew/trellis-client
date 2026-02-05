# Questionnaire Runner (User-Facing) — Implementation Plan (Typeform-style)

## Context

You have a questionnaire/template authoring prototype in `apps/ui`:

- `src/pages/layouts/questionnaire-editor.vue` (graph/branching editor)
- `src/pages/layouts/questionnaire-builder.vue` (builder-style config prototype)

You now want the **user-facing “fill out the questionnaire” experience**: a Typeform-style, fullscreen, immersive runner with transitions, validation, and autosave.

This doc grounds the runner in **how the current `apps/apptool` system actually works today**, so the new runner can interoperate with existing Firestore collections and business rules.

## Prototype scope (for `apps/ui`)

The immediate deliverable is a **UX prototype/mockup in `apps/ui`** (like the other Apptool pages in this repo):

- Uses **mock data** (no Firestore wiring)
- Simulates **autosave** + **resume** (e.g., local state / localStorage)
- Implements **branching/validation** only to the degree needed to demonstrate UX and interaction patterns

The long-term target is to implement the real runner inside `apps/tri` (matching backend contracts).

---

## Goals

- Provide a **modern, fullscreen, step-by-step** questionnaire experience.
- Support **branching** (answer → next question), plus “Applicable/Not Applicable” outcomes.
- Provide **great UX**:
  - smooth transitions
  - optimistic saves + resiliency
  - clear validation + error recovery
  - keyboard-first navigation
  - accessible semantics/focus management
- Preserve compatibility with `apps/apptool` data contracts where required.

## Non-goals (for this prototype)

- Re-implement the entire legacy portal/admin surfaces.
- Create a fully generalized rules engine beyond the existing branching model.
- Solve auth, permissions, and Firestore security rules in this document (we’ll note assumptions).

---

## What `apps/apptool` does today (authoritative behavior)

### Core concept: “Determination”

A “determination” is effectively:

- A `VersionDocument` in `Versions/{versionId}`
- A `PermitDocument` in `Facilities/{facility}/Permits/{versionYear}`
- Subcollections under that permit:
  - `Responses` (per-question answer documents)
  - `Response status` (per standard/unit status docs)

### Key UX behavior observed in `apps/apptool`

From `apps/apptool/src/version.js` + `src/widgets.js`:

- **Step-by-step Q&A** inside a single Standard (module).
- **Branching**: each answer points to the next question, or `End Questioning`.
- **Validation**: cannot proceed without answering.
- **Explanation screens**:
  - some answers have `showExplanation` and `explanation` text
  - answers may also map to “tasks” (ECMS tasks)
  - after answering, the UI may show an explanation (and tasks) before continuing
- **Completion screen**:
  - at the end, status is `Applicable` or `Not Applicable`
  - explanations are compiled into a list
- **Resume**:
  - if a user returns, the UI shows the “last answered” question and lets them continue
- **Back**:
  - user can go back; when backing up, the system clears the response for the current question (sets `response=''`, `timestamp=''`)
- **Multi-unit standards**:
  - a standard may be evaluated for multiple units
  - there’s a unit list UI and per-unit determination flow
  - an overall `multipleprogress` is updated on `unit0`
- **Notes + links** on a response:
  - responses can include a `note` and `links` (stringified JSON)

### How a determination is created

From `apps/apptool/src/widgets.js:createFacilityDetermination` and invoked by `apps/apptool/src/portal.js:createNewDetermination`:

- Creates `Versions/{versionId}`
- Creates `Facilities/{facility}/Permits/{versionId}`
- Creates, for each applicable standard:
  - `Response status` doc for `unit0`
- Creates, for each question in those standards:
  - a blank `Responses` doc for `unit0`

Notes:

- `apps/apptool/src/portal.js` also supports auto-creating/opening a determination via URL params (`facility` + `templateID`) and redirecting to the new `version`.

---

## Data contracts (must-know)

### Canonical TypeScript types

Source: `apps/apptool/common/types/ApplicabilityTool.d.ts`

- `QuestionnaireDocument`
- `StandardDocument`
- `QuestionDocument`
- `AnswerDocument`
- `ResponseDocument`
- `ResponseStatusDocument`
- `VersionDocument`

### Firestore collections (current)

#### Templates

- `Questionnaires/{questionnaireId}`: `QuestionnaireDocument`
- `Standards/{standardId}`: `StandardDocument`
- `Questions/{questionId}`: `QuestionDocument`
  - `Questions/{questionId}/Answers/{answerId}`: `AnswerDocument`
- `Tasks/{taskId}`: `TaskDocument`

#### Determinations

- `Versions/{versionId}`: `VersionDocument`
- `Facilities/{facility}/Permits/{versionYear}`: `PermitDocument`
  - `Responses/{questionId}-unit{unit}`: `ResponseDocument`
  - `Response status/{program}-{standard}-unit{unit}`: `ResponseStatusDocument`

### ID conventions (important)

- `ResponseDocument.id` is typically `${questionID}-unit${unit}`
- `ResponseStatusDocument.id` is typically `${program}-${standard}-unit${unit}`
- `unit` is usually `'0'` for non-multi-unit or the initial multi-unit, else `String(Date.now())` when new units are created.

---

## `apps/ui` builder/editor schema mapping

Your `apps/ui` editor prototype uses a similar model (simplified):

- Question has `type: 'multiple-choice' | 'free-response'`
- Answer has:
  - `nextQuestionId: string | 'end'`
  - `applicability: 'applicable' | 'not-applicable' | 'continue'`
  - `explanation?: string`
  - `showExplanation: boolean`
  - optional `tasks` association (prototype does this)

### Mapping to `apps/apptool` types

- `QuestionDocument.type`:
  - `'Multiple Choice'` ↔ `'multiple-choice'`
  - `'Free Response'` ↔ `'free-response'`
- `AnswerDocument.branch`:
  - `'End Questioning'` ↔ `'end'`
  - otherwise ↔ `nextQuestionId`
- `AnswerDocument.applicability`:
  - `''` ↔ `'continue'`
  - `'Applicable'` ↔ `'applicable'`
  - `'Not Applicable'` ↔ `'not-applicable'`

---

## Proposed UX: Typeform-style runner

### High-level flow

1. **Enter runner** (fullscreen)
2. **(Optional) Start screen**
   - standard name, description, estimated time, “Start”
3. **Question steps**
   - one question per screen
   - large typography, calm whitespace
   - answer input area
   - primary CTA: `Next` (disabled until valid)
4. **(Optional) Explanation step**
   - appears if `showExplanation === true` or if tasks were triggered
   - CTA: `Continue`
5. **End screen**
   - status outcome (Applicable / Not Applicable)
   - compiled explanations
   - tasks summary (if any)
   - CTA: `Complete standard`

### Runner chrome

- **Progress**:
  - show “Question X of Y” (but Y may be unknown with branching)
  - show a subtle progress bar based on visited questions vs total questions in standard
- **Controls**:
  - `Back` (when possible)
  - `Save` status (Saved / Saving… / Offline)
  - `Exit` / “Back to portal”
- **Keyboard**:
  - `Enter` = Next (when valid)
  - `Shift+Enter` in textarea = newline (no submit)
  - `ArrowUp/Down` to move between multiple-choice options (roving tabindex)
  - `Esc` opens exit confirmation

### Accessibility requirements

- Semantic form controls.
- Visible focus ring.
- Reduced motion support (respect `prefers-reduced-motion`).
- Screen reader announcements for validation errors and route/step changes.

---

## State machine (recommended)

Model the runner as a small state machine so branching + explanations are predictable.

### States

- `idle` (loading template + existing responses)
- `question` (showing a question step)
- `explanation` (showing explanation/tasks step)
- `review` (end-of-flow summary)
- `saving` (transient flag; should not block UI)
- `error` (fatal load failure)

### Transitions

- `idle -> question` when template + responses are loaded
- `question -> explanation` when step demands it
- `question -> question` when no explanation and branch continues
- `question -> review` when branch ends
- `explanation -> question` continue to branch target
- `explanation -> review` if branch ended

### Branch resolution rules (mirror current `apps/apptool`)

- For **multiple choice (single-select)**:
  - selected answer determines `branch`, `applicability`, `showExplanation`, `explanation`, `tasks`
- For **multiple choice (multi-select)**:
  - `apps/apptool` effectively assumes all chosen answers share a single branch
  - runner should enforce one of:
    - **Constraint A (match legacy)**: all selected options must have same `nextQuestionId`, else show validation error
    - **Constraint B (new behavior)**: support per-answer branching with priority rule (not recommended for compatibility)
- For **free response**:
  - `apps/apptool` uses the first answer doc for branching and applicability.

### Applicability aggregation (multi-select)

Mirror current logic:

- start with `''`
- if any answer sets `Applicable`, final = `Applicable`
- else if any sets `Not Applicable` and none set `Applicable`, final = `Not Applicable`
- else remain `''` (continue)

---

## Persistence + autosave

### What must be persisted to interop

At minimum for compatibility:

- `ResponseDocument.response`
- `ResponseDocument.timestamp`
- `ResponseStatusDocument.sequence` (stringified JSON array of visited question IDs)

Additionally (optional but strongly recommended):

- `ResponseDocument.note` (per-question note)
- `ResponseDocument.links` (stringified JSON)
- `ResponseStatusDocument.explanations`

### Save behavior (recommended)

- **Optimistic UI**: update local state immediately.
- **Debounced writes** for free response (e.g., 500–800ms after typing stops).
- **Immediate write** for multiple choice selection.
- Always show a small “Saved” indicator.

### Resume behavior

- On load, determine the resume question using:
  - `ResponseStatusDocument.sequence` if present and valid
  - otherwise compute from saved responses (similar to `getOverviewObj` + `getBranch` in `apps/apptool/src/widgets.js`)

---

## Completion logic

### When does a standard become complete?

When the flow reaches `End Questioning` and the user confirms completion on the end screen.

### What to write on completion

Update `ResponseStatusDocument` (for the relevant unit):

- `progress: 'Complete'`
- `status: 'Applicable' | 'Not Applicable' | 'Not Determined' | 'Co-Location Applicable' | ''`
- `explanations`: compiled explanations
- `sequence`: the visited question IDs

For multi-unit standards, also update:

- `multipleUnitOverallProgressUpdate(...)` semantics (see `apps/apptool/src/widgets.js`)

---

## “Import prior year” (prefill) feature

### Observed behavior

- Legacy UI exposes “Import Prior Year” and then warns user to confirm imported answers.
- The importer is implemented as a Vue modal workflow and is exported onto `window` for the legacy pages.

Concrete entry points:

- `apps/apptool/vue-components/components/ResponsesReviewAllForImport.vue` exports `importResponsesFromPastDetermination(versionID, filters?)`.
- `apps/apptool/src/Version.html` and `apps/apptool/src/Portal.html` import it and attach it to `window.importResponsesFromPastDetermination`.
- `apps/apptool/src/portal.js:createNewDetermination` calls `importResponsesFromPastDetermination(newVersionDocumentId)` immediately after creating the determination.
- `apps/apptool/src/version.js:importStandard()` calls `importResponsesFromPastDetermination(version, { standardFilter, programFilter })`.

Under the hood:

- `apps/apptool/vue-components/services/versions.ts` includes robust import helpers:
  - `responsesFilterToCurrentValidQuestions(...)` to ensure imports still match current template
  - `importResponses(...)` to batch-write imported responses + status

### Proposed runner UX

- Offer import before starting a standard (or from a menu)
- Show preview:
  - how many answers will import
  - where it will stop (disclaimer if template mismatch)
- After import:
  - land user on the next unanswered question
  - show a subtle callout: “Imported answers require review”

---

## UI architecture in `apps/ui` (recommended)

### New page + components

Create a dedicated runner page:

- `src/pages/layouts/apptool-runner.vue` (or similar)

Core components:

- `RunnerShell` (fullscreen chrome + layout)
- `RunnerProgress` (progress + save status)
- `QuestionStep`
  - `MultipleChoiceStep`
  - `FreeResponseStep`
- `ExplanationStep`
- `RunnerSummaryStep`

### State management

- A Pinia store or composable `useQuestionnaireRunner()` owning:
  - loaded template graph
  - current step
  - responses map
  - queue of writes / save status

### Animation

Use `motion-v` (already used in `questionnaire-editor.vue`):

- step enter/exit transitions (slide + fade)
- keep durations short (150–250ms)
- avoid heavy parallax
- respect `prefers-reduced-motion`

---

## Validation strategy

Use `zod` + `vee-validate` (already in `apps/ui` stack), but keep it pragmatic:

- Multiple choice:
  - required → must select 1 (or >=1 for multi)
- Free response:
  - required → must be non-empty after trim
  - optionally validate formats if question guidance implies (date, number)

Error presentation:

- inline message under control
- on `Next`, focus the invalid control
- show a toast only for unexpected failures (network)

---

## Testing plan (prototype-level)

### Unit tests (Vitest)

- Branch resolution
- Multi-select branch constraint
- Resume logic from `sequence`
- Applicability aggregation

### Interaction tests

- Keyboard navigation
- Enter-to-advance behaviors
- Reduced motion mode

---

## Open questions / decisions (answer before implementation)

- Should the runner operate at:
  - **standard-level** (match current system), or
  - **whole-questionnaire-level** (a single Typeform across all standards)?

Recommendation for fastest alignment: **standard-level runner** first.

- Multi-unit UX:
  - Keep legacy “unit list then run per unit” OR
  - integrate unit selection into runner start screen

Recommendation: keep unit list as a separate step/screen, then run per unit.

---

## Implementation milestones

1. Runner page skeleton + routing
2. Load template graph + existing responses (mock first, then Firestore)
3. Question step rendering + validation
4. Branching + explanation steps
5. Autosave + resume
6. Completion + status writes
7. Import prior year flow
8. Multi-unit support

---

## Feature Gap Analysis: `apps/apptool` vs `apps/ui` Prototype

_Audit date: 2026-01-12_

### ✅ Features Present in Both

| Feature                         | `apps/apptool`                     | `apps/ui` Prototype                   | Notes                         |
| ------------------------------- | ---------------------------------- | ------------------------------------- | ----------------------------- |
| Question navigation (Next/Back) | ✅ `nextQ()`, `prevQ()`            | ✅ `goNextFromQuestion()`, `goBack()` | Both handle branching logic   |
| Multiple choice (single-select) | ✅ Radio buttons                   | ✅ `ui-radio-group`                   | Full parity                   |
| Multiple choice (multi-select)  | ✅ Checkboxes                      | ✅ `ui-checkbox` with array state     | Full parity                   |
| Free response questions         | ✅ Textarea                        | ✅ `ui-textarea`                      | Full parity                   |
| Branching logic                 | ✅ `data-branch` attrs             | ✅ `answer.next` property             | Different impl, same behavior |
| Explanation screens             | ✅ `#appExplanation` div           | ✅ `step === 'explanation'`           | With tasks display            |
| Validation (required fields)    | ✅ Alert on empty                  | ✅ Inline error message               | Prototype has better UX       |
| Progress indicator              | ✅ None visible                    | ✅ Progress bar + "X of Y"            | Prototype is better           |
| Saved state indicator           | ✅ None visible                    | ✅ Multiple indicators                | Prototype is better           |
| Keyboard navigation             | ✅ Limited                         | ✅ Enter to advance                   | Prototype is better           |
| End/completion screen           | ✅ `#completionDiv`                | ✅ `step === 'end'`                   | Both show outcome             |
| Applicability outcome           | ✅ `Applicable` / `Not Applicable` | ✅ Same outcomes                      | Full parity                   |
| Resume from last position       | ✅ `sequence` tracking             | ✅ `history` + `localStorage`         | Different impl, same behavior |
| Animations/transitions          | ✅ jQuery `fadeIn/fadeOut`         | ✅ `motion-v`                         | Prototype is smoother         |

### ⚠️ Features in `apps/apptool` NOT YET in Prototype

| Feature                       | Priority | Description                                            | Implementation Notes                                                      |
| ----------------------------- | -------- | ------------------------------------------------------ | ------------------------------------------------------------------------- |
| **Guidance panel**            | Medium   | Right sidebar showing contextual guidance per question | `ResponseDocument.guidance` field, display in sidebar or collapsible      |
| **Notes per question**        | Medium   | Add/edit notes attached to individual responses        | Modal or inline input, persists to `ResponseDocument.note`                |
| **Links/attachments**         | Low      | Attach external URLs to responses                      | `ResponseDocument.links` (JSON array), modal UI                           |
| **Help button/modal**         | Low      | Flag question for help, send support request           | Modal with form, email integration                                        |
| **Import Prior Year**         | High     | Pre-fill responses from previous determination         | Vue modal workflow, requires `versions.ts` service                        |
| **Multi-unit support**        | High     | Run determination for multiple units of same standard  | Unit list UI, per-unit responses, `multipleprogress`                      |
| **Standard dependencies**     | Medium   | Warning when standard depends on another               | Check `ResponseStatusDocument.notSubjectToDeterminationDueToStandardName` |
| **Co-location assignment**    | Low      | Assign standard to co-located facility                 | Special "Not Applicable" flow                                             |
| **Revise completed standard** | Medium   | Reset a completed standard to edit answers             | Clear progress, re-run flow                                               |
| **Next Module navigation**    | Low      | Auto-advance to next standard after completion         | Portal-level navigation                                                   |
| **App notes (per standard)**  | Low      | Notes at the standard level (not question level)       | `ResponseStatusDocument.appnote`                                          |

### 🎨 UX Improvements in Prototype (Not in `apps/apptool`)

| Feature                         | Description                               |
| ------------------------------- | ----------------------------------------- |
| **Fullscreen immersive mode**   | Typeform-style focused experience         |
| **Smooth animations**           | `motion-v` enter/exit transitions         |
| **Progress bar**                | Visual progress indicator at bottom       |
| **Multiple saved indicators**   | Header, footer, near progress             |
| **Clickable answer containers** | Entire row is click target                |
| **Required/Optional badge**     | Clear visual indicator per question       |
| **Blurred backdrop**            | Modern glassmorphism aesthetic            |
| **Keyboard-first design**       | Enter to advance, proper focus management |
| **Responsive design**           | Works on mobile/tablet                    |

### 📋 Recommended Priority for Gap Closure

#### Phase 1 (Critical for MVP)

1. **Import Prior Year** - Core workflow feature
2. **Multi-unit support** - Many standards require this

#### Phase 2 (Important for Parity)

3. **Guidance panel** - Helps users understand questions
4. **Notes per question** - Audit trail requirement
5. **Revise completed standard** - Error recovery

#### Phase 3 (Nice to Have)

6. **Standard dependencies** - Edge case handling
7. **Links/attachments** - Power user feature
8. **Help button** - Support workflow
9. **Co-location assignment** - Rare use case

### Technical Debt Notes

- `apps/apptool` uses jQuery + vanilla JS with inline HTML generation
- `apps/ui` prototype uses Vue 3 + Composition API + TypeScript
- When implementing in `apps/tri`, use the prototype patterns but wire to Firestore
- The `versions.ts` service in `apps/apptool/vue-components/services/` has reusable import logic
