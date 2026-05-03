import { d as defineEventHandler } from '../../../nitro/nitro.mjs';
import { access, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import 'zod';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:crypto';
import 'better-sqlite3';
import 'crypto';
import '@google/generative-ai';
import 'node:vm';
import '@instantdb/admin';
import 'node:url';
import '@iconify/utils';
import 'consola';

const DIRS = [
  join(homedir(), ".nodebook"),
  join(homedir(), ".nodebook", "files"),
  join(homedir(), ".nodebook", "files", "entities"),
  join(homedir(), ".nodebook", "files", "thumbnails")
];
const initLocal_post = defineEventHandler(async () => {
  let created = false;
  for (const dir of DIRS) {
    try {
      await access(dir);
    } catch {
      await mkdir(dir, { recursive: true });
      created = true;
    }
  }
  return {
    created,
    path: DIRS[0],
    dirs: DIRS
  };
});

export { initLocal_post as default };
//# sourceMappingURL=init-local.post.mjs.map
