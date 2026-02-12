// Docs: https://www.instantdb.com/docs/modeling-data

const i = (() => {
  const mkField = () => {
    const chain: any = {
      unique: () => chain,
      indexed: () => chain,
      optional: () => chain,
    }
    return chain
  }

  return {
    schema: (value: any) => value,
    entity: (value: any) => value,
    string: mkField,
    number: mkField,
    boolean: mkField,
    json: mkField,
  }
})()

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
    // Personal Calendar Items (polymorphic: task, event, payment, note, trip)
    // ========================================================================

    calendarItems: i.entity({
      ownerId: i.string().indexed(),
      type: i.string().indexed(), // task | event | trip | payment | note
      title: i.string(),
      description: i.string().optional(),
      startDate: i.string().indexed(), // YYYY-MM-DD
      endDate: i.string().optional(),
      allDay: i.boolean(),
      startTime: i.string().optional(), // HH:mm
      endTime: i.string().optional(),
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
      attachments: i.json().optional(), // Attachment[]
      reminders: i.json().optional(), // Reminder[]
      recurrence: i.json().optional(), // RecurrenceRule
      // Task-specific
      taskStatus: i.string().indexed().optional(), // pending | in-progress | completed | overdue …
      checklist: i.json().optional(), // ChecklistItem[]
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
      // Note-specific
      content: i.string().optional(),
      pinned: i.boolean().optional(),
      linkedItems: i.json().optional(), // string[]
      // Trip-specific
      origin: i.string().optional(),
      destination: i.string().optional(),
      transportation: i.string().optional(),
      budget: i.number().optional(),
      confirmationNumber: i.string().optional(),
      tripStatus: i.string().optional(),
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
      userId: i.string().indexed(),
      email: i.string().optional(),
      name: i.string().optional(),
      role: i.string().optional(),
      status: i.string().optional(),
      invitedAt: i.number().optional(),
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

    stations: i.entity({
      ownerId: i.string().indexed(),
      tenantId: i.string().unique().indexed(),
      name: i.string(),
      slug: i.string().indexed(),
      logoUrl: i.string().optional(),
      location: i.json().optional(),
      features: i.json().optional(),
      cablecastBaseUrl: i.string(),
      cablecastApiPath: i.string().optional(),
      streamUrl: i.string().optional(),
      createdAt: i.number().optional(),
      updatedAt: i.number().optional(),
    }),

    stationMembers: i.entity({
      stationId: i.string().indexed(),
      userId: i.string().indexed(),
      email: i.string().optional(),
      name: i.string().optional(),
      role: i.string().indexed(), // admin, producer, sponsor, viewer
      status: i.string().optional(), // active, invited, suspended
      invitedBy: i.string().optional(),
      invitedAt: i.number().optional(),
      joinedAt: i.number().optional(),
      updatedAt: i.number().optional(),
    }),

    viewershipSessions: i.entity({
      stationId: i.string().indexed(),
      visitorId: i.string().indexed(),
      userId: i.string().indexed().optional(),
      channelId: i.string().indexed().optional(),
      showId: i.string().indexed().optional(),
      showTitle: i.string().optional(),
      streamType: i.string().optional(),
      userAgent: i.string().optional(),
      referrer: i.string().optional(),
      startedAt: i.number().indexed(),
      endedAt: i.number().optional(),
      totalWatchTime: i.number().optional(),
    }),

    viewershipEvents: i.entity({
      sessionId: i.string().indexed(),
      stationId: i.string().indexed(),
      eventType: i.string().indexed(),
      channelId: i.string().indexed().optional(),
      showId: i.string().indexed().optional(),
      timestamp: i.number().indexed(),
      metadata: i.json().optional(),
    }),

    viewershipAggregates: i.entity({
      stationId: i.string().indexed(),
      channelId: i.string().indexed().optional(),
      showId: i.string().indexed().optional(),
      periodType: i.string().indexed(),
      periodStart: i.number().indexed(),
      periodKey: i.string().unique().indexed(),
      totalViews: i.number().optional(),
      uniqueViewers: i.number().optional(),
      totalWatchTime: i.number().optional(),
      peakConcurrent: i.number().optional(),
      liveViews: i.number().optional(),
      vodViews: i.number().optional(),
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

    organizationStations: {
      forward: {
        on: 'organizations',
        has: 'many',
        label: 'stations',
      },
      reverse: {
        on: 'stations',
        has: 'one',
        label: 'organization',
      },
    },

    stationViewershipSessions: {
      forward: {
        on: 'stations',
        has: 'many',
        label: 'viewershipSessions',
      },
      reverse: {
        on: 'viewershipSessions',
        has: 'one',
        label: 'station',
      },
    },

    sessionViewershipEvents: {
      forward: {
        on: 'viewershipSessions',
        has: 'many',
        label: 'events',
      },
      reverse: {
        on: 'viewershipEvents',
        has: 'one',
        label: 'session',
      },
    },

    stationViewershipAggregates: {
      forward: {
        on: 'stations',
        has: 'many',
        label: 'viewershipAggregates',
      },
      reverse: {
        on: 'viewershipAggregates',
        has: 'one',
        label: 'station',
      },
    },

    stationStationMembers: {
      forward: {
        on: 'stations',
        has: 'many',
        label: 'members',
      },
      reverse: {
        on: 'stationMembers',
        has: 'one',
        label: 'station',
      },
    },

    // ========================================================================
    // Comments Links
    // ========================================================================

    calendarItemComments: {
      forward: {
        on: 'calendarItems',
        has: 'many',
        label: 'comments',
      },
      reverse: {
        on: 'comments',
        has: 'one',
        label: 'calendarItem',
      },
    },
  },
  rooms: {},
})

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema
type AppSchema = _AppSchema
const schema: AppSchema = _schema

export type { AppSchema }
export default schema
