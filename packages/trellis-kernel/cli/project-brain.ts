import { readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export type JsonLdGraphNode = Record<string, unknown> & {
  '@id': string;
  '@type': string | string[];
};

export type JsonLdGraphDoc = Record<string, unknown> & {
  '@context'?: unknown;
  '@graph': JsonLdGraphNode[];
};

async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export async function readGraphJsonld(
  filePath: string,
): Promise<JsonLdGraphDoc> {
  let parsed: unknown;
  try {
    const raw = await readFile(filePath, 'utf-8');
    parsed = JSON.parse(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read graph JSON-LD at ${filePath}: ${msg}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Invalid graph JSON-LD at ${filePath}: expected an object`);
  }

  const doc = parsed as Record<string, unknown>;
  const graph = doc['@graph'];
  if (!Array.isArray(graph)) {
    throw new Error(
      `Invalid graph JSON-LD at ${filePath}: missing @graph array`,
    );
  }

  return doc as JsonLdGraphDoc;
}

export async function writeGraphJsonld(
  filePath: string,
  doc: JsonLdGraphDoc,
): Promise<void> {
  await ensureDir(dirname(filePath));

  const tmpPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  const output = JSON.stringify(doc, null, 2) + '\n';
  await writeFile(tmpPath, output);
  await rename(tmpPath, filePath);
}

export function findGraphNode(
  doc: JsonLdGraphDoc,
  id: string,
): { node: JsonLdGraphNode; index: number } | undefined {
  for (let i = 0; i < doc['@graph'].length; i++) {
    const node = doc['@graph'][i];
    if (node && typeof node === 'object' && node['@id'] === id) {
      return { node, index: i };
    }
  }
  return undefined;
}

export function generateEntityId(type: string, title?: string): string {
  const slugBase = (title ?? '').trim();
  const slug = slugBase
    ? slugBase
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    : randomUUID();

  const typeSlug = type
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return `urn:tql:${typeSlug || 'entity'}:${slug}`;
}

function assertSafeFieldKey(key: string): void {
  if (!key || key.trim() === '') {
    throw new Error('Field key cannot be empty');
  }
  if (key.startsWith('@')) {
    throw new Error(`Field keys starting with '@' are reserved: ${key}`);
  }
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
    throw new Error(`Unsafe field key: ${key}`);
  }
}

function parseFieldValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return raw;
    }
  }

  const num = Number(trimmed);
  if (!Number.isNaN(num) && trimmed !== '' && /^-?\d+(\.\d+)?$/.test(trimmed)) {
    return num;
  }

  return raw;
}

export function upsertNode(
  doc: JsonLdGraphDoc,
  opts: {
    id: string;
    type: string;
    data: Record<string, unknown>;
    mode: 'create' | 'upsert';
  },
): JsonLdGraphNode {
  const existing = findGraphNode(doc, opts.id);
  if (existing && opts.mode === 'create') {
    throw new Error(`Entity already exists: ${opts.id}`);
  }

  const now = new Date().toISOString();

  const base: JsonLdGraphNode = {
    '@id': opts.id,
    '@type': opts.type,
    ...opts.data,
  };

  if (existing) {
    const merged: JsonLdGraphNode = {
      ...existing.node,
      ...base,
      updatedAt: now,
    };
    if (!('createdAt' in merged)) {
      merged.createdAt = now;
    }

    doc['@graph'][existing.index] = merged;
    return merged;
  }

  if (!('createdAt' in base)) base.createdAt = now;
  if (!('updatedAt' in base)) base.updatedAt = now;

  doc['@graph'].push(base);
  return base;
}

export function setNodeField(
  doc: JsonLdGraphDoc,
  id: string,
  key: string,
  value: unknown,
): JsonLdGraphNode {
  assertSafeFieldKey(key);
  const existing = findGraphNode(doc, id);
  if (!existing) {
    throw new Error(`Entity not found: ${id}`);
  }

  const now = new Date().toISOString();
  const updated: JsonLdGraphNode = {
    ...existing.node,
    [key]: value,
    updatedAt: now,
  };

  doc['@graph'][existing.index] = updated;
  return updated;
}

export function addRelation(
  doc: JsonLdGraphDoc,
  fromId: string,
  relation: string,
  toId: string,
): JsonLdGraphNode {
  assertSafeFieldKey(relation);
  const existing = findGraphNode(doc, fromId);
  if (!existing) {
    throw new Error(`Entity not found: ${fromId}`);
  }

  const prevVal = (existing.node as any)[relation];

  let next: unknown;
  if (prevVal === undefined) {
    next = [toId];
  } else if (Array.isArray(prevVal)) {
    next = prevVal.includes(toId) ? prevVal : [...prevVal, toId];
  } else if (typeof prevVal === 'string') {
    next = prevVal === toId ? [prevVal] : [prevVal, toId];
  } else {
    throw new Error(
      `Cannot link: relation ${relation} on ${fromId} is not a string or array`,
    );
  }

  return setNodeField(doc, fromId, relation, next);
}

export function removeRelation(
  doc: JsonLdGraphDoc,
  fromId: string,
  relation: string,
  toId: string,
): JsonLdGraphNode {
  assertSafeFieldKey(relation);
  const existing = findGraphNode(doc, fromId);
  if (!existing) {
    throw new Error(`Entity not found: ${fromId}`);
  }

  const prevVal = (existing.node as any)[relation];
  if (prevVal === undefined) {
    return existing.node;
  }

  if (Array.isArray(prevVal)) {
    const filtered = prevVal.filter((v) => v !== toId);
    return setNodeField(doc, fromId, relation, filtered);
  }

  if (typeof prevVal === 'string') {
    if (prevVal !== toId) return existing.node;
    return setNodeField(doc, fromId, relation, []);
  }

  throw new Error(
    `Cannot unlink: relation ${relation} on ${fromId} is not a string or array`,
  );
}

export function appendToArrayField(
  doc: JsonLdGraphDoc,
  id: string,
  key: string,
  value: unknown,
): JsonLdGraphNode {
  assertSafeFieldKey(key);
  const existing = findGraphNode(doc, id);
  if (!existing) {
    throw new Error(`Entity not found: ${id}`);
  }

  const prevVal = (existing.node as any)[key];
  let next: unknown;

  if (prevVal === undefined) {
    next = [value];
  } else if (Array.isArray(prevVal)) {
    next = [...prevVal, value];
  } else {
    next = [prevVal, value];
  }

  return setNodeField(doc, id, key, next);
}

export function applyFieldPairs(
  base: Record<string, unknown>,
  pairs: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx <= 0) {
      throw new Error(`Invalid field pair: ${pair}. Expected key=value`);
    }
    const key = pair.slice(0, idx).trim();
    assertSafeFieldKey(key);
    const rawVal = pair.slice(idx + 1);
    if (!key) {
      throw new Error(`Invalid field pair: ${pair}. Expected key=value`);
    }
    out[key] = parseFieldValue(rawVal);
  }
  return out;
}
