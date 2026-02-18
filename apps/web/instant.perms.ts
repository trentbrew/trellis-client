// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from '@instantdb/core'

const rules = {
  shares: {
    bind: [
      'isRecipient',
      'auth.id != null && auth.id == data.userId',
      'isSharer',
      'auth.id != null && auth.id == data.sharedBy',
    ],
    allow: {
      view: 'isRecipient || isSharer',
      create: 'auth.id != null',
      delete: 'isSharer',
      update: 'isSharer',
    },
  },
  notifications: {
    bind: ['isRecipient', 'auth.id != null && auth.id == data.recipientId'],
    allow: {
      view: 'isRecipient',
      create: 'auth.id != null',
      delete: 'isRecipient',
      update: 'isRecipient',
    },
  },
  applications: {
    bind: [
      'isOwner',
      'auth.id != null && auth.id == data.ownerId',
      'isOrgMember',
      "auth.id in data.ref('organization.members.userId')",
      'isOrgMemberNonPrivate',
      "auth.id in data.ref('organization.members.userId') && data.accessLevel != 'private'",
      'isWorldMember',
      "auth.id in data.ref('members.userId')",
    ],
    allow: {
      view: 'isOwner || isOrgMemberNonPrivate || isWorldMember',
      create: 'auth.id != null',
      delete: 'isOwner',
      update: 'isOwner || isOrgMember',
    },
  },
  settings: {
    bind: ['isOwner', 'auth.id != null && auth.id == data.ownerId'],
    allow: {
      view: 'isOwner',
      create: 'isOwner',
      delete: 'isOwner',
      update: 'isOwner',
    },
  },
  members: {
    bind: [
      'isOwner',
      'auth.id != null && auth.id == data.ownerId',
      'isSelf',
      'auth.id != null && auth.id == data.userId',
      'isOrgMember',
      "auth.id in data.ref('organization.members.userId')",
    ],
    allow: {
      view: 'isOwner || isSelf || isOrgMember',
      create: 'auth.id != null',
      delete: 'isOwner',
      update: 'isOwner || isSelf',
    },
  },
  collections: {
    bind: [
      'isOwner',
      'auth.id != null && auth.id == data.ownerId',
      'isAppOrgMember',
      "auth.id in data.ref('application.organization.members.userId')",
    ],
    allow: {
      view: 'isOwner || isAppOrgMember',
      create: 'auth.id != null',
      delete: 'isOwner',
      update: 'isOwner || isAppOrgMember',
    },
  },
  comments: {
    bind: ['isAuthor', 'auth.id != null && auth.id == data.authorId'],
    allow: {
      view: 'true',
      create: 'auth.id != null',
      delete: 'isAuthor',
      update: 'isAuthor',
    },
  },
  organizations: {
    bind: [
      'isOwner',
      'auth.id != null && auth.id == data.ownerId',
      'isMember',
      "auth.id in data.ref('members.userId')",
    ],
    allow: {
      view: 'isOwner || isMember',
      create: 'auth.id != null',
      delete: 'isOwner',
      update: 'isOwner || isMember',
    },
  },
  chatNotificationPrefs: {
    bind: ['isOwner', 'auth.id != null && auth.id == data.userId'],
    allow: {
      view: 'isOwner',
      create: 'isOwner',
      delete: 'isOwner',
      update: 'isOwner',
    },
  },
  messages: {
    bind: ['isAuthor', 'auth.id != null && auth.id == data.authorId'],
    allow: {
      view: 'auth.id != null',
      create: 'auth.id != null',
      delete: 'isAuthor',
      update: 'isAuthor',
    },
  },
  channels: {
    bind: [
      'isCreator',
      'auth.id != null && auth.id == data.createdBy',
      'isOrgMember',
      "auth.id in data.ref('organization.members.userId')",
    ],
    allow: {
      view: 'isOrgMember || isCreator',
      create: 'auth.id != null',
      delete: 'isCreator',
      update: 'isCreator || isOrgMember',
    },
  },
  entities: {
    bind: [
      'isOwner',
      'auth.id != null && auth.id == data.ownerId',
      'isOrgMember',
      "auth.id in data.ref('organization.members.userId')",
      'isPublic',
      "data.visibility == 'public'",
      'isSharedGuest',
      "auth.id in data.ref('shares.userId')",
    ],
    allow: {
      view: 'isOwner || isOrgMember || isPublic || isSharedGuest',
      create: 'auth.id != null',
      delete: 'isOwner',
      update: 'auth.id != null',
    },
  },
} satisfies InstantRules

export default rules
