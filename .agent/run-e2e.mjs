import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const child = spawn(
  './node_modules/.bin/playwright',
  ['test', 'tests/e2e/browse-form-view.spec.ts', '--project=chromium', '--reporter=line'],
  {
    cwd: '/Users/trentbrew/TURTLE/Projects/Packages/trellis-client/apps/web',
    env: { ...process.env, CI: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
)

let out = ''
child.stdout.on('data', (d) => { out += d })
child.stderr.on('data', (d) => { out += d })
child.on('close', (code) => {
  writeFileSync('/Users/trentbrew/TURTLE/Projects/Packages/trellis-client/.agent/e2e-capture.log', out)
  writeFileSync('/Users/trentbrew/TURTLE/Projects/Packages/trellis-client/.agent/e2e-capture.exit', String(code ?? 1))
  console.log('exit', code)
  console.log(out.slice(-4000))
})
