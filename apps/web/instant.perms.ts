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
//   guests    — can view entities with a matching share record (via entityShares link)

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

  // ── Applications (Worlds) ─────────────────────────────────────────────
  // Access levels: 'open' (default/null) | 'closed' | 'private'
  //   open/closed: visible to all org members (closed restricts content access client-side)
  //   private: only visible to the owner or explicitly added world members
  applications: {
    allow: {
      view: 'isOwner || isOrgMemberNonPrivate || isWorldMember',
      create: 'auth.id != null',
      update: 'isOwner || isOrgMember',
      delete: 'isOwner',
    },
    bind: [
      'isOwner', 'auth.id != null && auth.id == data.ownerId',
      'isOrgMember', 'auth.id in data.ref(\'organization.members.userId\')',
      'isOrgMemberNonPrivate', 'auth.id in data.ref(\'organization.members.userId\') && data.accessLevel != \'private\'',
      'isWorldMember', 'auth.id in data.ref(\'members.userId\')',
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
  //   guests can view entities they have a share record for (via entityShares link)
  entities: {
    allow: {
      view: 'isOwner || isOrgMember || isPublic || isSharedGuest',
      create: 'auth.id != null',
      update: 'isOwner || isOrgMember',
      delete: 'isOwner',
    },
    bind: [
      'isOwner', 'auth.id != null && auth.id == data.ownerId',
      'isOrgMember', 'auth.id in data.ref(\'organization.members.userId\')',
      'isPublic', 'data.visibility == \'public\'',
      'isSharedGuest', 'auth.id in data.ref(\'shares.userId\')',
    ],
  },

  // ── Shares ──────────────────────────────────────────────────────────
  // Entity-level access grants for guests.
  // Viewable by the recipient (userId) or the sharer.
  // Any authenticated org member can create shares.
  // Only the sharer or org admins can delete.
  shares: {
    allow: {
      view: 'isRecipient || isSharer',
      create: 'auth.id != null',
      update: 'isSharer',
      delete: 'isSharer',
    },
    bind: [
      'isRecipient', 'auth.id != null && auth.id == data.userId',
      'isSharer', 'auth.id != null && auth.id == data.sharedBy',
    ],
  },

  // ── Notifications ────────────────────────────────────────────────
  // Only the recipient can view, update (mark read), or delete their own notifications.
  // Creation is done server-side via admin SDK.
  notifications: {
    allow: {
      view: 'isRecipient',
      create: 'auth.id != null',
      update: 'isRecipient',
      delete: 'isRecipient',
    },
    bind: ['isRecipient', 'auth.id != null && auth.id == data.recipientId'],
  },

  // ── Comments ──────────────────────────────────────────────────────
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
