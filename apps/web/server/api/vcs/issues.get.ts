import { basename } from 'node:path'
import { createError, defineEventHandler } from 'h3'

import { runTrellisIssueList } from '../../utils/vcs-issue-cli'
import { parseIssueList } from '../../utils/vcs-issue-parser'
import { resolveVcsRoot } from '../../utils/vcs-root'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const root = resolveVcsRoot(config.trellisVcsRoot || process.env.TRELLIS_VCS_ROOT)

  if (!root) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No TrellisVCS repository found',
      data: { code: 'NO_VCS_REPO', message: 'No .trellis/ops.json found in workspace' },
    })
  }

  const result = runTrellisIssueList(root)
  if (result.exitCode !== 0) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Trellis CLI failed',
      data: {
        code: 'CLI_ERROR',
        message: result.stderr.trim() || result.stdout.trim() || 'trellis issue list failed',
      },
    })
  }

  const issues = parseIssueList(result.stdout)

  return {
    workspaceRoot: root,
    workspaceName: basename(root),
    fetchedAt: new Date().toISOString(),
    issues,
  }
})
