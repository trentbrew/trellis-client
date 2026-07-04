import { spawnSync } from 'node:child_process'

const CLI_TIMEOUT_MS = 10_000

export interface TrellisCliResult {
  stdout: string
  stderr: string
  exitCode: number
}

function runTrellis(args: string[]): TrellisCliResult {
  const result = spawnSync('trellis', args, {
    encoding: 'utf8',
    timeout: CLI_TIMEOUT_MS,
  })

  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.status ?? 1,
  }
}

export function runTrellisIssueList(root: string): TrellisCliResult {
  return runTrellis(['issue', 'list', '--path', root])
}

export function runTrellisIssueShow(root: string, id: string): TrellisCliResult {
  return runTrellis(['issue', 'show', id, '--path', root])
}
