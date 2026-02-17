// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from '@instantdb/core'

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
      imageURL: i.string().optional(),
      type: i.string().optional(),
    }),

    organizations: i.entity({
      ownerId: i.string().indexed(),
      name: i.string(),
      slug: i.string().indexed(),
      avatar: i.string().optional(),
      description: i.string().optional(),
      status: i.string().optional(),
      plan: i.string().optional(),
      createdAt: i.number().optional(),
      updatedAt: i.number().optional(),
    }),

    // ========================================================================
    // Comments (activity feed for any entity)
    // ========================================================================

    comments: i.entity({
      entityId: i.string().indexed(), // ID of the parent entity (calendarItem, task, etc.)
      entityType: i.string().indexed(), // 'calendarItem' | 'task' | etc.
      authorId: i.string().indexed(),
      authorName: i.string(),
      authorAvatar: i.string().optional(),
      content: i.string(),
      type: i.string().indexed(), // 'comment' | 'status_change' | 'attachment' | 'created'
      metadata: i.json().optional(), // type-specific data (e.g. old/new status, filename)
      createdAt: i.number().indexed(),
      updatedAt: i.number().optional(),
      deletedAt: i.number().optional(),
    }),

    // ========================================================================
    // Entities (polymorphic: task, event, payment, note, person, project…)
    // ========================================================================

    entities: i.entity({
      ownerId: i.string().indexed(),
      orgId: i.string().indexed().optional(), // scopes entity to a workspace
      visibility: i.string().optional(), // 'org' (default) | 'private' | 'public'
      type: i.string().indexed(), // task | event | trip | payment | note | person | project …
      title: i.string(),
      description: i.string().optional(),
      startDate: i.string().indexed(), // YYYY-MM-DD
      endDate: i.string().optional(),
      allDay: i.boolean(),
      startTime: i.string().optional(), // HH:mm
      endTime: i.string().optional(),
      duration: i.number().optional(), // minutes
      priority: i.string().indexed(), // critical | high | medium | low
      urgency: i.string().optional(), // urgent | not-urgent
      priorityOverride: i.boolean().optional(),
      urgencyOverride: i.boolean().optional(),
      category: i.string().indexed().optional(),
      tags: i.json().optional(), // string[]
      owner: i.string().optional(),
      involved: i.json().optional(), // string[]
      folder: i.string().optional(),
      notes: i.string().optional(),
      references: i.json().optional(), // Reference[] — entity cross-references
      attachments: i.json().optional(), // Attachment[]
      commentCount: i.number().optional(),
      fileCount: i.number().optional(),
      reminders: i.json().optional(), // Reminder[]
      recurrence: i.json().optional(), // RecurrenceRule
      formulas: i.json().optional(), // FormulaField[]
      dependsOn: i.json().optional(), // string[] — entity IDs this depends on
      // Task-specific
      taskStatus: i.string().indexed().optional(), // pending | in-progress | completed | overdue …
      checklist: i.json().optional(), // @deprecated — use checklistContent
      checklistContent: i.string().optional(), // TipTap TaskList HTML
      // Event-specific
      location: i.string().optional(),
      attendees: i.json().optional(), // Attendee[]
      conferenceLink: i.string().optional(),
      eventType: i.string().optional(), // meeting | appointment | training …
      // Payment-specific
      amount: i.number().optional(),
      currency: i.string().optional(),
      payee: i.string().optional(),
      paymentMethod: i.string().optional(),
      recurring: i.boolean().optional(),
      paymentStatus: i.string().optional(),
      invoiceNumber: i.string().optional(),
      direction: i.string().optional(), // debit | credit
      paymentChannel: i.string().optional(), // online | in_store | atm | other
      merchantName: i.string().optional(),
      merchantLogoUrl: i.string().optional(),
      merchantWebsite: i.string().optional(),
      authorizedDate: i.string().optional(),
      accountName: i.string().optional(),
      accountMask: i.string().optional(),
      financeCategory: i.string().optional(),
      financeCategoryDetailed: i.string().optional(),
      counterparties: i.json().optional(), // TransactionCounterparty[]
      referenceNumber: i.string().optional(),
      checkNumber: i.string().optional(),
      pending: i.boolean().optional(),
      lineItems: i.json().optional(), // PaymentLineItem[]
      subtotal: i.number().optional(),
      taxAmount: i.number().optional(),
      taxRate: i.number().optional(),
      discount: i.number().optional(),
      tip: i.number().optional(),
      balanceAfter: i.number().optional(),
      memo: i.string().optional(),
      // Note-specific
      content: i.string().optional(),
      pinned: i.boolean().optional(),
      linkedItems: i.json().optional(), // string[]
      // Slide deck-specific
      slides: i.string().optional(), // JSON string of slide data
      slideTheme: i.string().optional(), // dark | light | auto
      slideTransition: i.string().optional(), // fade | slide | none
      // Bookmark-specific
      bookmarkUrl: i.string().optional(),
      favicon: i.string().optional(),
      thumbnail: i.string().optional(),
      siteName: i.string().optional(),
      excerpt: i.string().optional(),
      // Trip-specific
      origin: i.string().optional(),
      destination: i.string().optional(),
      transportation: i.string().optional(),
      budget: i.number().optional(),
      confirmationNumber: i.string().optional(),
      tripStatus: i.string().optional(),
      // Appointment-specific
      provider: i.string().optional(),
      specialty: i.string().optional(),
      insurance: i.string().optional(),
      copay: i.number().optional(),
      visitNotes: i.string().optional(),
      followUpDate: i.string().optional(),
      // Reminder-specific
      acknowledged: i.boolean().optional(),
      // Deadline-specific
      sourceEntity: i.string().optional(),
      sourceType: i.string().optional(),
      isMet: i.boolean().optional(),
      // Milestone-specific
      projectId: i.string().optional(),
      achieved: i.boolean().optional(),
      // Sprint-specific
      sprintGoal: i.string().optional(),
      sprintStatus: i.string().optional(), // planning | active | completed | cancelled
      velocity: i.number().optional(),
      // Budget-specific
      budgetStatus: i.string().optional(), // draft | active | closed | over-budget
      // Actor-specific (person, contact, organization, vendor)
      email: i.string().optional(),
      phone: i.string().optional(),
      avatar: i.string().optional(),
      entityRole: i.string().optional(), // role within org (e.g. 'engineer')
      relationships: i.json().optional(), // string[] — related entity IDs
      jobTitle: i.string().optional(),
      company: i.string().optional(),
      website: i.string().optional(),
      industry: i.string().optional(),
      memberCount: i.number().optional(),
      services: i.json().optional(), // string[]
      contractEnd: i.string().optional(),
      entityRating: i.number().optional(),
      address: i.string().optional(),
      socialLinks: i.json().optional(), // SocialLink[]
      birthday: i.string().optional(),
      pronouns: i.string().optional(),
      logo: i.string().optional(),
      founded: i.string().optional(),
      // File-specific (document class)
      mimeType: i.string().optional(),
      sizeBytes: i.number().optional(),
      fileUrl: i.string().optional(),
      storagePath: i.string().optional(),
      slug: i.string().optional(),
      isPublished: i.boolean().optional(),
      templateFor: i.string().optional(),
      // Container-specific (project, folder, collection, goal)
      children: i.json().optional(), // string[] — child entity IDs
      progress: i.number().optional(), // 0–1
      containerStatus: i.string().optional(), // active | archived | completed | on-hold
      parentEntityId: i.string().indexed().optional(),
      isSystemGenerated: i.boolean().optional(),
      collectionType: i.string().optional(), // database | document | board | calendar | gallery | form | page | list
      // Goal-specific
      targetDate: i.string().optional(),
      metric: i.string().optional(),
      targetValue: i.number().optional(),
      currentValue: i.number().optional(),
      // Timestamps
      createdAt: i.number().optional(),
      updatedAt: i.number().optional(),
    }),

    applications: i.entity({
      ownerId: i.string().indexed(),
      orgId: i.string().indexed(),
      name: i.string(),
      slug: i.string().indexed(),
      icon: i.string().optional(),
      color: i.string().optional(),
      description: i.string().optional(),
      isPublic: i.boolean().optional(),
      accessLevel: i.string().optional(), // 'open' (default) | 'closed' | 'private'
      ontologies: i.json().optional(),
      createdAt: i.number().optional(),
      updatedAt: i.number().optional(),
    }),

    collections: i.entity({
      ownerId: i.string().indexed(),
      appId: i.string().indexed(),
      parentId: i.string().indexed().optional(),
      title: i.string(),
      slug: i.string().indexed(),
      icon: i.string().optional(),
      description: i.string().optional(),
      type: i.string().optional(),
      order: i.number().optional(),
      isPublished: i.boolean().optional(),
      content: i.string().optional(),
      createdBy: i.string().optional(),
      createdAt: i.number().optional(),
      updatedAt: i.number().optional(),
    }),

    members: i.entity({
      ownerId: i.string().indexed(),
      orgId: i.string().indexed(),
      worldId: i.string().indexed().optional(),
      userId: i.string().indexed(),
      email: i.string().optional(),
      name: i.string().optional(),
      role: i.string().indexed().optional(), // owner | admin | member | guest
      status: i.string().optional(), // pending | active | suspended
      invitedAt: i.number().optional(),
      joinedAt: i.number().optional(),
      inviteToken: i.string().indexed().optional(),
      inviterName: i.string().optional(),
      orgName: i.string().optional(),
      worldName: i.string().optional(),
    }),

    settings: i.entity({
      ownerId: i.string().indexed(),
      settingKey: i.string().unique().indexed(),
      entityType: i.string().indexed(),
      entityId: i.string().indexed(),
      key: i.string().indexed(),
      value: i.json().optional(),
      updatedAt: i.number().optional(),
    }),

    shares: i.entity({
      entityId: i.string().indexed(),     // entity or collection ID
      entityType: i.string().indexed(),   // 'entity' | 'collection'
      userId: i.string().indexed(),       // the guest's user ID
      orgId: i.string().indexed(),        // workspace context
      permission: i.string(),             // 'view' | 'comment' | 'edit'
      sharedBy: i.string(),               // who shared it
      sharedByName: i.string().optional(),
      createdAt: i.number().indexed(),
    }),

    notifications: i.entity({
      recipientId: i.string().indexed(),
      orgId: i.string().indexed(),
      orgName: i.string().optional(), // embedded for cross-org display
      type: i.string().indexed(), // invite_accepted | member_joined | role_changed | member_removed | mention | comment | system
      title: i.string(),
      message: i.string(),
      actionUrl: i.string().optional(),
      icon: i.string().optional(),
      variant: i.string().optional(), // default | success | warning | destructive | info
      isRead: i.boolean().indexed(),
      actorId: i.string().optional(),
      actorName: i.string().optional(),
      metadata: i.json().optional(),
      createdAt: i.number().indexed(),
    }),

  },
  links: {
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
      forward: {
        on: 'organizations',
        has: 'many',
        label: 'applications',
      },
      reverse: {
        on: 'applications',
        has: 'one',
        label: 'organization',
      },
    },

    organizationMembers: {
      forward: {
        on: 'organizations',
        has: 'many',
        label: 'members',
      },
      reverse: {
        on: 'members',
        has: 'one',
        label: 'organization',
      },
    },

    applicationMembers: {
      forward: {
        on: 'applications',
        has: 'many',
        label: 'members',
      },
      reverse: {
        on: 'members',
        has: 'many',
        label: 'applications',
      },
    },

    applicationCollections: {
      forward: {
        on: 'applications',
        has: 'many',
        label: 'collections',
      },
      reverse: {
        on: 'collections',
        has: 'one',
        label: 'application',
      },
    },

    // ========================================================================
    // Comments Links
    // ========================================================================

    organizationEntities: {
      forward: {
        on: 'organizations',
        has: 'many',
        label: 'entities',
      },
      reverse: {
        on: 'entities',
        has: 'one',
        label: 'organization',
      },
    },

    entityComments: {
      forward: {
        on: 'entities',
        has: 'many',
        label: 'comments',
      },
      reverse: {
        on: 'comments',
        has: 'one',
        label: 'entity',
      },
    },

    entityShares: {
      forward: {
        on: 'entities',
        has: 'many',
        label: 'shares',
      },
      reverse: {
        on: 'shares',
        has: 'one',
        label: 'entity',
      },
    },

    organizationShares: {
      forward: {
        on: 'organizations',
        has: 'many',
        label: 'shares',
      },
      reverse: {
        on: 'shares',
        has: 'one',
        label: 'organization',
      },
    },

    organizationNotifications: {
      forward: {
        on: 'organizations',
        has: 'many',
        label: 'notifications',
      },
      reverse: {
        on: 'notifications',
        has: 'one',
        label: 'organization',
      },
    },
  },
  rooms: {
    // Workspace-level presence (who's online)
    workspace: {
      presence: i.entity({
        userId: i.string(),
        joinedAt: i.number(),
      }),
    },
    // Per-entity editing presence (who has an entity dialog open)
    entity: {
      presence: i.entity({
        userId: i.string(),
        email: i.string(),
        name: i.string(),
        avatar: i.string(),
        editingField: i.string(),
        openedAt: i.number(),
      }),
    },
  },
})

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema
type AppSchema = _AppSchema
const schema: AppSchema = _schema

export type { AppSchema }
export default schema
