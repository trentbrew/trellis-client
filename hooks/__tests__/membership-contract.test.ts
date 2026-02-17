/**
 * Membership Contract Tests
 *
 * Validates that the core ontology defines the expected shape for
 * Member, Notification, and Share types — and that the schema
 * validator correctly accepts/rejects data against those contracts.
 */

import { describe, it, expect } from 'bun:test';
import { CORE_ONTOLOGY } from '../../packages/tql/kernel/core-ontology.js';
import {
  validateAgainstSchema,
  getSelectOptions,
  getFieldDefault,
  getRequiredFields,
  hasField,
} from '../../packages/tql/kernel/schema-validator.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function findSchema(id: string) {
  const schema = CORE_ONTOLOGY.find((s) => s['@id'] === id);
  if (!schema) throw new Error(`Schema ${id} not found in CORE_ONTOLOGY`);
  return schema;
}

// ── core:Member ──────────────────────────────────────────────────────────────

describe('core:Member ontology', () => {
  const schema = findSchema('core:Member');

  it('exists in CORE_ONTOLOGY', () => {
    expect(schema).toBeDefined();
    expect(schema.tier).toBe('core');
  });

  it('defines expected fields', () => {
    const fieldNames = schema.fields.map((f) => f.name);
    expect(fieldNames).toContain('name');
    expect(fieldNames).toContain('email');
    expect(fieldNames).toContain('role');
    expect(fieldNames).toContain('status');
    expect(fieldNames).toContain('orgId');
    expect(fieldNames).toContain('userId');
    expect(fieldNames).toContain('invitedAt');
    expect(fieldNames).toContain('joinedAt');
  });

  it('constrains role to exactly [owner, admin, member, guest]', () => {
    const options = getSelectOptions(schema, 'role');
    expect(options).toEqual(['owner', 'admin', 'member', 'guest']);
  });

  it('constrains status to exactly [pending, active, suspended]', () => {
    const options = getSelectOptions(schema, 'status');
    expect(options).toEqual(['pending', 'active', 'suspended']);
  });

  it('defaults role to "member"', () => {
    expect(getFieldDefault(schema, 'role')).toBe('member');
  });

  it('defaults status to "pending"', () => {
    expect(getFieldDefault(schema, 'status')).toBe('pending');
  });

  it('requires name, role, status, orgId', () => {
    const required = getRequiredFields(schema);
    expect(required).toContain('name');
    expect(required).toContain('role');
    expect(required).toContain('status');
    expect(required).toContain('orgId');
  });

  it('accepts a valid member record', () => {
    const result = validateAgainstSchema(
      {
        name: 'Alice',
        email: 'alice@example.com',
        role: 'owner',
        status: 'active',
        orgId: 'org-123',
      },
      schema,
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects missing required fields', () => {
    const result = validateAgainstSchema({ email: 'bob@test.com' }, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes('name'))).toBe(true);
    expect(result.errors.some((e) => e.includes('role'))).toBe(true);
    expect(result.errors.some((e) => e.includes('status'))).toBe(true);
    expect(result.errors.some((e) => e.includes('orgId'))).toBe(true);
  });

  it('rejects invalid role value', () => {
    const result = validateAgainstSchema(
      { name: 'Bob', role: 'superadmin', status: 'active', orgId: 'org-1' },
      schema,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('role') && e.includes('superadmin'))).toBe(true);
  });

  it('rejects invalid status value', () => {
    const result = validateAgainstSchema(
      { name: 'Bob', role: 'member', status: 'banned', orgId: 'org-1' },
      schema,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('status') && e.includes('banned'))).toBe(true);
  });
});

// ── core:Notification ────────────────────────────────────────────────────────

describe('core:Notification ontology', () => {
  const schema = findSchema('core:Notification');

  it('exists in CORE_ONTOLOGY', () => {
    expect(schema).toBeDefined();
    expect(schema.tier).toBe('core');
  });

  it('defines expected fields', () => {
    const fieldNames = schema.fields.map((f) => f.name);
    expect(fieldNames).toContain('recipientId');
    expect(fieldNames).toContain('orgId');
    expect(fieldNames).toContain('orgName');
    expect(fieldNames).toContain('type');
    expect(fieldNames).toContain('title');
    expect(fieldNames).toContain('message');
    expect(fieldNames).toContain('isRead');
    expect(fieldNames).toContain('createdAt');
  });

  it('constrains notification types', () => {
    const options = getSelectOptions(schema, 'type');
    expect(options).toContain('invite_accepted');
    expect(options).toContain('member_joined');
    expect(options).toContain('member_removed');
    expect(options).toContain('role_changed');
    expect(options).toContain('system');
  });

  it('constrains variant values', () => {
    const options = getSelectOptions(schema, 'variant');
    expect(options).toEqual(['default', 'success', 'warning', 'destructive', 'info']);
  });

  it('defaults isRead to false', () => {
    expect(getFieldDefault(schema, 'isRead')).toBe(false);
  });

  it('accepts a valid notification', () => {
    const result = validateAgainstSchema(
      {
        recipientId: 'user-1',
        type: 'invite_accepted',
        title: 'Invite accepted',
        message: 'Alice accepted your invite.',
        createdAt: '2026-02-17',
      },
      schema,
    );
    expect(result.valid).toBe(true);
  });

  it('rejects invalid notification type', () => {
    const result = validateAgainstSchema(
      {
        recipientId: 'user-1',
        type: 'invalid_type',
        title: 'Test',
        message: 'Test',
        createdAt: '2026-02-17',
      },
      schema,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('type'))).toBe(true);
  });
});

// ── core:Share ───────────────────────────────────────────────────────────────

describe('core:Share ontology', () => {
  const schema = findSchema('core:Share');

  it('exists in CORE_ONTOLOGY', () => {
    expect(schema).toBeDefined();
    expect(schema.tier).toBe('core');
  });

  it('defines expected fields', () => {
    expect(hasField(schema, 'entityId')).toBe(true);
    expect(hasField(schema, 'entityType')).toBe(true);
    expect(hasField(schema, 'userId')).toBe(true);
    expect(hasField(schema, 'orgId')).toBe(true);
    expect(hasField(schema, 'permission')).toBe(true);
    expect(hasField(schema, 'sharedBy')).toBe(true);
    expect(hasField(schema, 'createdAt')).toBe(true);
  });

  it('constrains permission to [view, comment, edit]', () => {
    const options = getSelectOptions(schema, 'permission');
    expect(options).toEqual(['view', 'comment', 'edit']);
  });

  it('defaults permission to "view"', () => {
    expect(getFieldDefault(schema, 'permission')).toBe('view');
  });

  it('constrains entityType to [entity, collection]', () => {
    const options = getSelectOptions(schema, 'entityType');
    expect(options).toEqual(['entity', 'collection']);
  });
});

// ── Schema Validator Edge Cases ──────────────────────────────────────────────

describe('validateAgainstSchema edge cases', () => {
  const schema = findSchema('core:Member');

  it('handles empty object', () => {
    const result = validateAgainstSchema({}, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('handles null values for required fields', () => {
    const result = validateAgainstSchema(
      { name: null, role: null, status: null, orgId: null },
      schema,
    );
    expect(result.valid).toBe(false);
  });

  it('handles empty string for required fields', () => {
    const result = validateAgainstSchema(
      { name: '', role: 'member', status: 'active', orgId: 'org-1' },
      schema,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('name'))).toBe(true);
  });

  it('ignores extra fields not in schema', () => {
    const result = validateAgainstSchema(
      { name: 'Alice', role: 'member', status: 'active', orgId: 'org-1', extraField: 'ignored' },
      schema,
    );
    expect(result.valid).toBe(true);
  });
});
