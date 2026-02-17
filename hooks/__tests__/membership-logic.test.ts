/**
 * Membership Logic Tests
 *
 * Tests for pure business logic functions that govern role changes,
 * member removal, and ownership transfer. No database access.
 */

import { describe, it, expect } from 'bun:test';
import {
  canChangeRole,
  canRemoveMember,
  canTransferOwnership,
  isValidRoleTransition,
  getMemberPermissions,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
} from '../../apps/web/app/lib/permissions.js';

// ── Role Hierarchy ───────────────────────────────────────────────────────────

describe('ROLE_HIERARCHY', () => {
  it('defines exactly [guest, member, admin, owner]', () => {
    expect(ROLE_HIERARCHY).toEqual(['guest', 'member', 'admin', 'owner']);
  });

  it('does not include superadmin', () => {
    expect(ROLE_HIERARCHY).not.toContain('superadmin');
  });
});

// ── Role Permissions ─────────────────────────────────────────────────────────

describe('ROLE_PERMISSIONS', () => {
  it('owner has full permissions', () => {
    expect(ROLE_PERMISSIONS.owner).toEqual({ read: true, write: true, admin: true });
  });

  it('admin has full permissions', () => {
    expect(ROLE_PERMISSIONS.admin).toEqual({ read: true, write: true, admin: true });
  });

  it('member has read+write but not admin', () => {
    expect(ROLE_PERMISSIONS.member).toEqual({ read: true, write: true, admin: false });
  });

  it('guest has read only', () => {
    expect(ROLE_PERMISSIONS.guest).toEqual({ read: true, write: false, admin: false });
  });
});

// ── getMemberPermissions ─────────────────────────────────────────────────────

describe('getMemberPermissions', () => {
  it('returns correct permissions for each role', () => {
    expect(getMemberPermissions('owner')).toEqual({ read: true, write: true, admin: true });
    expect(getMemberPermissions('admin')).toEqual({ read: true, write: true, admin: true });
    expect(getMemberPermissions('member')).toEqual({ read: true, write: true, admin: false });
    expect(getMemberPermissions('guest')).toEqual({ read: true, write: false, admin: false });
  });
});

// ── canChangeRole ────────────────────────────────────────────────────────────

describe('canChangeRole', () => {
  it('owner can change any role to any non-owner role', () => {
    expect(canChangeRole('owner', 'admin', 'member')).toBe(true);
    expect(canChangeRole('owner', 'member', 'admin')).toBe(true);
    expect(canChangeRole('owner', 'member', 'guest')).toBe(true);
    expect(canChangeRole('owner', 'guest', 'member')).toBe(true);
  });

  it('owner cannot promote someone to owner via role change', () => {
    expect(canChangeRole('owner', 'admin', 'owner')).toBe(false);
    expect(canChangeRole('owner', 'member', 'owner')).toBe(false);
  });

  it('admin can change member/guest roles', () => {
    expect(canChangeRole('admin', 'member', 'guest')).toBe(true);
    expect(canChangeRole('admin', 'guest', 'member')).toBe(true);
  });

  it('admin cannot promote to admin or owner', () => {
    expect(canChangeRole('admin', 'member', 'admin')).toBe(false);
    expect(canChangeRole('admin', 'member', 'owner')).toBe(false);
  });

  it('admin cannot demote another admin', () => {
    expect(canChangeRole('admin', 'admin', 'member')).toBe(false);
  });

  it('member cannot change any roles', () => {
    expect(canChangeRole('member', 'guest', 'member')).toBe(false);
    expect(canChangeRole('member', 'member', 'admin')).toBe(false);
  });

  it('guest cannot change any roles', () => {
    expect(canChangeRole('guest', 'member', 'guest')).toBe(false);
  });

  it('no-op role change returns false', () => {
    expect(canChangeRole('owner', 'admin', 'admin')).toBe(false);
    expect(canChangeRole('admin', 'member', 'member')).toBe(false);
  });
});

// ── canRemoveMember ──────────────────────────────────────────────────────────

describe('canRemoveMember', () => {
  it('owner can remove admin/member/guest', () => {
    expect(canRemoveMember('owner', 'admin', false)).toBe(true);
    expect(canRemoveMember('owner', 'member', false)).toBe(true);
    expect(canRemoveMember('owner', 'guest', false)).toBe(true);
  });

  it('owner cannot remove the sole owner (themselves)', () => {
    expect(canRemoveMember('owner', 'owner', true)).toBe(false);
  });

  it('admin can remove member/guest', () => {
    expect(canRemoveMember('admin', 'member', false)).toBe(true);
    expect(canRemoveMember('admin', 'guest', false)).toBe(true);
  });

  it('admin cannot remove owner', () => {
    expect(canRemoveMember('admin', 'owner', false)).toBe(false);
  });

  it('admin cannot remove another admin', () => {
    expect(canRemoveMember('admin', 'admin', false)).toBe(false);
  });

  it('member cannot remove anyone', () => {
    expect(canRemoveMember('member', 'guest', false)).toBe(false);
    expect(canRemoveMember('member', 'member', false)).toBe(false);
  });

  it('guest cannot remove anyone', () => {
    expect(canRemoveMember('guest', 'member', false)).toBe(false);
  });
});

// ── canTransferOwnership ─────────────────────────────────────────────────────

describe('canTransferOwnership', () => {
  it('only owner can transfer', () => {
    expect(canTransferOwnership('owner')).toBe(true);
  });

  it('admin cannot transfer', () => {
    expect(canTransferOwnership('admin')).toBe(false);
  });

  it('member cannot transfer', () => {
    expect(canTransferOwnership('member')).toBe(false);
  });

  it('guest cannot transfer', () => {
    expect(canTransferOwnership('guest')).toBe(false);
  });
});

// ── isValidRoleTransition ────────────────────────────────────────────────────

describe('isValidRoleTransition', () => {
  it('allows standard transitions', () => {
    expect(isValidRoleTransition('guest', 'member')).toBe(true);
    expect(isValidRoleTransition('member', 'admin')).toBe(true);
    expect(isValidRoleTransition('admin', 'member')).toBe(true);
    expect(isValidRoleTransition('member', 'guest')).toBe(true);
  });

  it('blocks transition to/from owner (must use transfer)', () => {
    expect(isValidRoleTransition('admin', 'owner')).toBe(false);
    expect(isValidRoleTransition('member', 'owner')).toBe(false);
    expect(isValidRoleTransition('owner', 'admin')).toBe(false);
    expect(isValidRoleTransition('owner', 'member')).toBe(false);
  });

  it('blocks no-op transitions', () => {
    expect(isValidRoleTransition('member', 'member')).toBe(false);
    expect(isValidRoleTransition('admin', 'admin')).toBe(false);
  });
});
