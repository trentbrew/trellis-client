// Docs: https://www.instantdb.com/docs/permissions
//
// Permission model: org-membership-based access via data.ref() link traversal.
//
// Link chain used in CEL:
//   organizations → members (via organizationMembers link)
//   entities → organization (via organizationEntities link) → members
//   applications → organization (via organizationApplications link) → members
//   collections → application (via applicationCollections link) → organization → members
//   members → organization (via organizationMembers link) → members
//
// Entity-level visibility:
//   'org'     — visible to all org members (default)
//   'private' — visible only to the creator (ownerId)
//   'public'  — visible to any authenticated user

type InstantRules = any

const rules = {
  // ── Organizations ─────────────────────────────────────────────────────
  // Viewable by the owner OR any member linked to the org.
  organizations: {
    allow: {
      view: 'isOwner || isMember',
      create: 'auth.id != null',
      update: 'isOwner',
      delete: 'isOwner',
    },
    bind: [
      'isOwner', 'auth.id != null && auth.id == data.ownerId',
      'isMember', 'auth.id in data.ref(\'members.userId\')',
    ],
  },

  // ── Applications ──────────────────────────────────────────────────────
  // Viewable by the owner OR any member of the parent org.
  applications: {
    allow: {
      view: 'isOwner || isOrgMember',
      create: 'auth.id != null',
      update: 'isOwner || isOrgMember',
      delete: 'isOwner',
    },
    bind: [
      'isOwner', 'auth.id != null && auth.id == data.ownerId',
      'isOrgMember', 'auth.id in data.ref(\'organization.members.userId\')',
    ],
  },

  // ── Collections ───────────────────────────────────────────────────────
  // Viewable by the owner OR any member of the app's parent org.
  collections: {
    allow: {
      view: 'isOwner || isAppOrgMember',
      create: 'auth.id != null',
      update: 'isOwner || isAppOrgMember',
      delete: 'isOwner',
    },
    bind: [
      'isOwner', 'auth.id != null && auth.id == data.ownerId',
      'isAppOrgMember', 'auth.id in data.ref(\'application.organization.members.userId\')',
    ],
  },

  // ── Members ───────────────────────────────────────────────────────────
  // Viewable by the inviter (ownerId), the member themselves (userId),
  // or any other member of the same org.
  members: {
    allow: {
      view: 'isOwner || isSelf || isOrgMember',
      create: 'auth.id != null',
      update: 'isOwner || isSelf',
      delete: 'isOwner',
    },
    bind: [
      'isOwner', 'auth.id != null && auth.id == data.ownerId',
      'isSelf', 'auth.id != null && auth.id == data.userId',
      'isOrgMember', 'auth.id in data.ref(\'organization.members.userId\')',
    ],
  },

  // ── Settings ──────────────────────────────────────────────────────────
  // User-scoped — only the owner can view/modify their own settings.
  settings: {
    allow: {
      view: 'isOwner',
      create: 'isOwner',
      update: 'isOwner',
      delete: 'isOwner',
    },
    bind: ['isOwner', 'auth.id != null && auth.id == data.ownerId'],
  },

  // ── Entities ──────────────────────────────────────────────────────────
  // Row-level visibility via the `visibility` field:
  //   'org' (default) — visible to all org members
  //   'private'       — visible only to the creator
  //   'public'        — visible to any authenticated user
  entities: {
    allow: {
      view: 'isOwner || isOrgMember || isPublic',
      create: 'auth.id != null',
      update: 'isOwner || isOrgMember',
      delete: 'isOwner',
    },
    bind: [
      'isOwner', 'auth.id != null && auth.id == data.ownerId',
      'isOrgMember', 'auth.id in data.ref(\'organization.members.userId\')',
      'isPublic', 'data.visibility == \'public\'',
    ],
  },

  // ── Comments ──────────────────────────────────────────────────────────
  // Publicly viewable within the app; only the author can edit/delete.
  comments: {
    allow: {
      view: 'true',
      create: 'auth.id != null',
      update: 'isAuthor',
      delete: 'isAuthor',
    },
    bind: ['isAuthor', 'auth.id != null && auth.id == data.authorId'],
  },
} satisfies InstantRules

export default rules
