import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));

function arg(args, name, short) {
  const longIdx = args.indexOf(`--${name}`);
  const shortIdx = short ? args.indexOf(`-${short}`) : -1;
  const idx =
    longIdx === -1
      ? shortIdx
      : shortIdx === -1
        ? longIdx
        : Math.min(longIdx, shortIdx);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function has(args, name) {
  return args.includes(`--${name}`);
}

function open(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

async function port(start) {
  for (let value = start; value < 65535; value += 1) {
    if (await open(value)) return value;
  }
  throw new Error(`No available port found at or after ${start}`);
}

function probe(origin) {
  return new Promise((resolve) => {
    const req = httpRequest(
      `${origin}/api/graph/health`,
      { method: 'GET', timeout: 1000 },
      (res) => {
        res.resume();
        resolve((res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300);
      },
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

function browser(url) {
  const cmd =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'cmd'
        : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
  child.on('error', () => {});
  child.unref();
}

export async function launch(args) {
  const value = arg(args, 'port', 'p') || process.env.TRELLIS_PORT || '1414';
  const start = Number.parseInt(value, 10);
  if (!Number.isInteger(start) || start < 1 || start > 65535) {
    throw new Error(`Invalid port: ${value}`);
  }

  const actual = await port(start);
  const entry = join(dir, '..', 'web', 'server', 'index.mjs');
  if (!existsSync(entry)) {
    throw new Error(
      'No bundled web runtime found. Run `pnpm run build:web` in packages/trellis-cli first.',
    );
  }

  if (actual !== start) {
    console.log(`Port ${start} is in use; using ${actual} instead.`);
  }

  const quiet = has(args, 'quiet');
  const origin = `http://127.0.0.1:${actual}`;
  const dbPath =
    process.env.TRELLIS_DB_PATH || join(process.cwd(), '.data', 'trellis.db');
  const child = spawn(process.execPath, [entry], {
    cwd: process.cwd(),
    stdio: ['ignore', quiet ? 'ignore' : 'pipe', quiet ? 'ignore' : 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: String(actual),
      NITRO_HOST: '127.0.0.1',
      NITRO_PORT: String(actual),
      NITRO_WORKERS: 'false',
      TRELLIS_PORT: String(actual),
      NUXT_PUBLIC_TRELLIS_PORT: String(actual),
    },
  });

  if (!quiet) {
    child.stdout?.on('data', (d) => process.stderr.write(`[web] ${d}`));
    child.stderr?.on('data', (d) => process.stderr.write(`[web] ${d}`));
  }

  let done = false;
  let error = null;
  child.on('exit', (code) => {
    done = true;
    if (code && code !== 0) error = `Trellis web exited with code ${code}`;
  });
  child.on('error', (err) => {
    error = err.message;
  });

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline && !done && !error) {
    if (await probe(origin)) {
      console.log(
        `\nTrellis web\n\nLocal:   ${origin}\nData:    ${dbPath}\nPress Ctrl+C to stop\n`,
      );
      if (!has(args, 'no-open')) browser(origin);
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  if (error) throw new Error(error);
  if (done) throw new Error('Trellis web stopped before it was ready');
  if (Date.now() >= deadline)
    throw new Error('Trellis web failed to start within 60s');

  const stop = () => {
    child.kill();
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  await new Promise((resolve) => {
    child.on('exit', resolve);
  });
}
