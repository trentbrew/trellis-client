/**
 * Platform link definitions for instant-local association resolution.
 * Extracted from the former InstantDB schema — no @instantdb dependency.
 */
export const platformSchemaLinks = {
  $usersLinkedPrimaryUser: {
    forward: {
      on: '$users',
      has: 'one',
      label: 'linkedPrimaryUser',
      onDelete: 'cascade',
    },
    reverse: {
      on: '$users',
      has: 'many',
      label: 'linkedGuestUsers',
    },
  },

  organizationApplications: {
    forward: { on: 'organizations', has: 'many', label: 'applications' },
    reverse: { on: 'applications', has: 'one', label: 'organization' },
  },

  organizationMembers: {
    forward: { on: 'organizations', has: 'many', label: 'members' },
    reverse: { on: 'members', has: 'one', label: 'organization' },
  },

  applicationMembers: {
    forward: { on: 'applications', has: 'many', label: 'members' },
    reverse: { on: 'members', has: 'many', label: 'applications' },
  },

  applicationCollections: {
    forward: { on: 'applications', has: 'many', label: 'collections' },
    reverse: { on: 'collections', has: 'one', label: 'application' },
  },

  organizationEntities: {
    forward: { on: 'organizations', has: 'many', label: 'entities' },
    reverse: { on: 'entities', has: 'one', label: 'organization' },
  },

  entityComments: {
    forward: { on: 'entities', has: 'many', label: 'comments' },
    reverse: { on: 'comments', has: 'one', label: 'entity' },
  },

  entityShares: {
    forward: { on: 'entities', has: 'many', label: 'shares' },
    reverse: { on: 'shares', has: 'one', label: 'entity' },
  },

  organizationShares: {
    forward: { on: 'organizations', has: 'many', label: 'shares' },
    reverse: { on: 'shares', has: 'one', label: 'organization' },
  },

  organizationNotifications: {
    forward: { on: 'organizations', has: 'many', label: 'notifications' },
    reverse: { on: 'notifications', has: 'one', label: 'organization' },
  },

  channelMessages: {
    forward: { on: 'channels', has: 'many', label: 'messages' },
    reverse: { on: 'messages', has: 'one', label: 'channel' },
  },

  organizationChannels: {
    forward: { on: 'organizations', has: 'many', label: 'channels' },
    reverse: { on: 'channels', has: 'one', label: 'organization' },
  },
} as const

export const platformSchema = {
  links: platformSchemaLinks,
}

export default platformSchema
