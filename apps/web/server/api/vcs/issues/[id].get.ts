import { createError, defineEventHandler, getRouterParam } from 'h3'

import { runTrellisIssueShow } from '../../../utils/vcs-issue-cli'
import { parseIssueShow } from '../../../utils/vcs-issue-parser'
import { resolveVcsRoot } from '../../../utils/vcs-root'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id || !/^TRL-\d+$/.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid issue id' })
  }

  const config = useRuntimeConfig(event)
  const root = resolveVcsRoot(config.trellisVcsRoot || process.env.TRELLIS_VCS_ROOT)

  if (!root) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No TrellisVCS repository found',
      data: { code: 'NO_VCS_REPO', message: 'No .trellis/ops.json found in workspace' },
    })
  }

  const result = runTrellisIssueShow(root, id)
  if (result.exitCode !== 0) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Issue not found',
      data: {
        code: 'CLI_ERROR',
        message: result.stderr.trim() || result.stdout.trim() || `trellis issue show ${id} failed`,
      },
    })
  }

  const detail = parseIssueShow(result.stdout, id)
  if (!detail) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Failed to parse issue detail',
      data: { code: 'PARSE_ERROR', message: `Could not parse trellis issue show ${id}` },
    })
  }

  return detail
})
