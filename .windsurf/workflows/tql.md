# TQL Project Brain: Agent Operating Contract

## Source of truth

- The project planning state lives in `.tql/`.
- Treat `.tql/graph.jsonld` as canonical structured state.
- Treat `.tql/docs/` as canonical longform content (specs/notes/decisions).

## Tooling rules (critical)

- Do NOT manually edit `.tql/graph.jsonld`.
- Initialize a project brain with `tql init`.
- Query the graph with:
  - `tql -d .tql/graph.jsonld -q 'FIND Task AS ?t WHERE ?t.status = "todo" RETURN ?t.title'`
  - `tql -d .tql/graph.jsonld -c` to show the catalog
- Mutate the graph with:
  - `tql add Task --title "..." --field status=todo`
  - `tql status <taskId> in_progress`
  - `tql set <entityId> key=value`
  - `tql link <fromId> dependsOn <toId>`
  - `tql unlink <fromId> dependsOn <toId>`
  - `tql attach artifact <entityId> <url>`

## Mutation safety (important)

- Prefer one write command at a time.
- After any write, immediately run a read-only verification:
  - `tql show <id>`
  - `tql list Task --status todo,in_progress,blocked`
  - `tql -d .tql/graph.jsonld -q '...'`
- Avoid large chained `cmd1 && cmd2 && ...` write batches; they are hard to review/approve and hard to recover from.
- If batching is necessary, keep it small (3-5 commands max) and include verification between batches.

## When asked to plan work

1. Create or update:
   - Goal -> Milestones -> Tasks
2. Link dependencies:
   - `dependsOn`, `blocks`, `implements`
3. Ensure every task has:
   - a clear title
   - status
   - owners (human/agent)
4. If information is missing, create a `Question` entity rather than guessing.

## When implementing code changes

1. Identify the relevant task(s):
   - `tql list tasks --status todo,in_progress,blocked`
2. Mark the active task `in_progress`:
   - `tql status <taskId> in_progress`
3. As you discover edge cases, record:
   - `Note` (facts) and `Decision` (choices + rationale).
4. When work is complete:
   - mark the task `done`
   - attach evidence (PR/commit/trace/url) via `tql attach artifact <taskId> <url>`

## When blocked or uncertain

- Create a `Question` entity describing what you need.
- Link it to the blocked task with `blocks`.
- Set task status to `blocked` with a reason.

## Hygiene

- Prefer small, composable tasks.
- Keep decisions explicit (Decision nodes) so future agents don't repeat reasoning.
