import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const child = spawn(
  './node_modules/.bin/vitest',
  ['run', 'app/lib/createFormResponse.test.ts', 'app/lib/trellis-projection-registry/browse-view-mode.test.ts', '--reporter=verbose'],
  {
    cwd: '/Users/trentbrew/TURTLE/Projects/Packages/trellis-client/apps/web',
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
)

let out = ''
child.stdout.on('data', (d) => { out += d })
child.stderr.on('data', (d) => { out += d })
child.on('close', (code) => {
  writeFileSync('/Users/trentbrew/TURTLE/Projects/Packages/trellis-client/.agent/vitest-capture.log', out)
  console.log('exit', code)
  console.log(out.slice(-3000))
})
