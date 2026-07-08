/** TrellisVCS explainer deck — agent onboarding artifact */
import type { SlideRegions } from '~/types/deck'

export const DECK_TRELLIS_VCS_ID = 'entity:deck-trellis-vcs'

export const SHOWROOM_ZONE = 'entity:founder-facility-showroom'
export const FOUNDER_FACILITY = 'entity:founder-facility'

export type VcsSlideSeed = {
  id: string
  title: string
  order: number
  regions: SlideRegions
  speakerNotes?: string
}

export const TRELLIS_VCS_SLIDES: VcsSlideSeed[] = [
  {
    id: 'entity:slide-vcs-title',
    title: 'Title',
    order: 1,
    regions: {
      eyebrow: 'Trellis · Campus',
      title: '<p>TrellisVCS</p>',
      body: '<p>Graph-native version control and issue tracking for human + agent teams.</p>',
    },
    speakerNotes:
      'Open with the mental model: VCS is agent episodic memory — not just file diffs.',
  },
  {
    id: 'entity:slide-vcs-git-diff',
    title: 'Not Git',
    order: 2,
    regions: {
      eyebrow: 'Substrate',
      title: '<p>Ops, not commits</p>',
      body:
        '<p>Every change is an <strong>immutable EAV operation</strong> on the knowledge graph — Tier 0 (files), Tier 1 (structure), Tier 2 (semantic/AST).</p><p>No staging area. No rebase. Milestones span <em>ranges</em> of ops with narrative messages.</p>',
      layoutId: 'content',
    },
    speakerNotes: 'Contrast three-tier ops vs line-level git. Milestones replace commit messages as story units.',
  },
  {
    id: 'entity:slide-vcs-issues',
    title: 'Issues',
    order: 3,
    regions: {
      eyebrow: 'Golden path',
      title: '<p>Issues are the unit of work</p>',
      body:
        '<p><code>trellis issue create</code> → triage → <code>trellis issue start TRL-N</code> (auto-branch + in_progress) → implement → <code>trellis issue check</code> → close with <code>--confirm</code>.</p><p>Acceptance criteria are executable gates — tests, lint, e2e paths.</p>',
      layoutId: 'content',
    },
    speakerNotes: 'Always start issues, never ad-hoc branch without traceability. pause/resume for context switches.',
  },
  {
    id: 'entity:slide-vcs-pipeline',
    title: 'Agent pipeline',
    order: 4,
    regions: {
      eyebrow: 'Multi-agent',
      title: '<p>Strategist → Designer → Architect → Executor → Reviewer</p>',
      body:
        '<p>Each role owns a lane. Handoffs use YAML envelopes: <code>from</code>, <code>to</code>, <code>re</code>, <code>status</code> (HANDOFF · REJECT · BLOCKED · CLARIFY).</p><p>Review loops back to Strategist for triage — never passive “done”.</p>',
      layoutId: 'content',
    },
    speakerNotes: 'UI wedges get Designer + e2e QA. Backend can skip Designer. Reviewer runs Playwright, never Executor.',
  },
  {
    id: 'entity:slide-vcs-branches',
    title: 'Branches',
    order: 5,
    regions: {
      eyebrow: 'Exploration',
      title: '<p>Branches = safe hypotheticals</p>',
      body:
        '<p><code>trellis branch issue/TRL-N-*</code> forks agent context. <code>trellis milestone create</code> checkpoints narrative progress.</p><p><code>trellis merge</code> reconciles lanes. <code>trellis log</code> is the causal stream — episodic memory for agents.</p>',
      layoutId: 'content',
    },
    speakerNotes: 'Branch per issue is the default. Milestones are checkpoints inside a branch, not single snapshots.',
  },
  {
    id: 'entity:slide-vcs-garden',
    title: 'Garden & decisions',
    order: 6,
    regions: {
      eyebrow: 'Memory',
      title: '<p>Revive abandoned reasoning</p>',
      body:
        '<p><strong>Idea Garden</strong> surfaces stale branches and context-switches — <code>trellis garden list</code>, <code>garden revive</code>.</p><p><strong>Decision traces</strong> record tool calls and rationale: <code>trellis decision list</code>, <code>decision chain</code>.</p>',
      layoutId: 'content',
    },
    speakerNotes: 'Search garden before starting fresh work. Decisions explain why, not just what changed.',
  },
  {
    id: 'entity:slide-vcs-rules',
    title: 'Rules',
    order: 7,
    regions: {
      eyebrow: 'Critical',
      title: '<p>Five rules agents must not break</p>',
      body:
        '<ol><li>Never edit <code>.trellis/</code> directly.</li><li>Start issues — don\'t branch in isolation.</li><li>Pause before context-switching.</li><li>All AC must pass before <code>issue close --confirm</code>.</li><li>Query the graph first: <code>trellis summary</code>, <code>trellis issue active</code>.</li></ol>',
      layoutId: 'content',
    },
    speakerNotes: 'Close with orientation commands. Point to packages/trellis-mcp and trellis-vcs skill for depth.',
  },
]

export const TRELLIS_VCS_SLIDE_QUERY = (deckId: string) =>
  `FIND entity AS ?s WHERE ?s.type = "slide" AND ?s.deckId = "${deckId}" RETURN ?s`
