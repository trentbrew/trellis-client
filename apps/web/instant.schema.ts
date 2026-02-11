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
      // ECMS User fields
      auditor: i.string().optional(),
      facilityID: i.string().indexed().optional(),
      branches: i.json().optional(), // ['environmental', 'safety']
      first_name: i.string().optional(),
      last_name: i.string().optional(),
      organizationalLocation: i.string().optional(),
      jobTitle: i.string().optional(),
      emailAliases: i.json().optional(),
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
    // ECMS Facilities
    // ========================================================================

    facilities: i.entity({
      facilityID: i.string().unique().indexed(),
      facility: i.string(), // Display name
      abbr: i.string().indexed(),
      group: i.string().indexed(),
      active: i.boolean(),
      djj: i.string().optional(),
      folder: i.string().optional(),
      isSynthetic: i.boolean().optional(),
      // Address
      address: i.string().optional(),
      city: i.string().optional(),
      state: i.string().optional(),
      zip: i.string().optional(),
      country: i.string().optional(),
      latitude: i.number().optional(),
      longitude: i.number().optional(),
      // Config
      timeZone: i.string().optional(),
      sharepointFolder: i.json().optional(),
      // Timestamps
      createdAt: i.number().optional(),
      createdBy: i.string().optional(),
      updatedAt: i.number().optional(),
      updatedBy: i.string().optional(),
    }),

    // ========================================================================
    // ECMS Roles
    // ========================================================================

    roles: i.entity({
      roleID: i.string().unique().indexed(),
      facilityID: i.string().indexed(),
      type: i.string().indexed(), // normal, environmentalManagers, etc.
      branches: i.json(), // ['environmental', 'safety']
      name: i.string(),
      owner: i.string().indexed(), // Single UID
      involved: i.json(), // Array of UIDs
      escalates: i.json().optional(), // Duration object
      mustBeAssignedToEscalate: i.boolean().optional(),
      // Timestamps
      createdAt: i.number().optional(),
      createdBy: i.string().optional(),
      updatedAt: i.number().optional(),
      updatedBy: i.string().optional(),
      deletedAt: i.number().optional(),
      deletedBy: i.string().optional(),
    }),

    // ========================================================================
    // ECMS Task Templates
    // ========================================================================

    taskTemplates: i.entity({
      taskTemplateID: i.string().unique().indexed(),
      standardTaskIds: i.json().optional(), // Array of standard task IDs
      branches: i.json(), // ['environmental', 'safety']
      title: i.string(),
      description: i.string().optional(),
      tracked: i.string().indexed(), // true | 'facility' | false
      schedules: i.json().optional(), // Array of ScheduleTemplate
      isFacilityScheduleChoiceAvailable: i.boolean().optional(),
      inspectionType: i.string().indexed(),
      category: i.string().indexed(),
      owner: i.json().optional(), // Record<FacilityID, UID>
      involved: i.json().optional(), // Record<FacilityID, UID[]>
      facilities: i.json().optional(), // Array of FacilityIDs
      customFieldDefinitions: i.json().optional(), // Array of TaskCustomField
      canGeneratorsCustomizeFields: i.boolean().optional(),
      editableBy: i.json().optional(), // Array of FacilityID | UID
      isStandardTaskTemplate: i.boolean().optional(),
      // Timestamps
      createdAt: i.number().optional(),
      createdBy: i.string().optional(),
      updatedAt: i.number().optional(),
      updatedBy: i.string().optional(),
      deletedAt: i.number().optional(),
      deletedBy: i.string().optional(),
    }),

    // ========================================================================
    // ECMS Task Generators
    // ========================================================================

    taskGenerators: i.entity({
      taskGeneratorID: i.string().unique().indexed(),
      taskTemplateID: i.string().indexed().optional(),
      facilityID: i.string().indexed(),
      title: i.string(),
      description: i.string().optional(),
      tracked: i.string().indexed(), // true | 'facility' | false
      schedule: i.json(), // Complete Schedule object
      inspectionType: i.string().indexed(),
      category: i.string().indexed(),
      owner: i.string().indexed(), // UID
      involved: i.json().optional(), // Array of UIDs
      ownerConfigured: i.json().optional(), // UserRoleConfig
      involvedConfigured: i.json().optional(), // UserRoleConfig[]
      parentFolderIDs: i.json().optional(), // Array of FolderIDs
      sharepointFolder: i.json().optional(),
      customFieldDefinitions: i.json().optional(), // Array of TaskCustomField
      standardTaskIds: i.json().optional(),
      branches: i.json().optional(),
      dontGenerateTasksBefore: i.string().optional(), // ISO date
      dueDateAdjustments: i.json().optional(), // Record<date, date>
      dueDatesExcluded: i.json().optional(), // Array of dates
      externalTaskIDs: i.json().optional(), // Array of external task IDs
      isDone: i.boolean().optional(),
      permit: i.string().optional(),
      fesAudit: i.string().optional(),
      enforcementAction: i.string().optional(),
      correctiveActionFor: i.string().optional(), // TaskID
      selfAssessmentGoal: i.string().optional(),
      neuAssignmentID: i.string().optional(),
      // Timestamps
      createdAt: i.number().optional(),
      createdBy: i.string().optional(),
      updatedAt: i.number().optional(),
      updatedBy: i.string().optional(),
      deletedAt: i.number().optional(),
      deletedBy: i.string().optional(),
    }),

    // ========================================================================
    // ECMS Tasks
    // ========================================================================

    tasks: i.entity({
      taskID: i.string().unique().indexed(),
      taskTemplateID: i.string().indexed().optional(),
      taskGeneratorID: i.string().indexed(),
      facilityID: i.string().indexed(),
      title: i.string(),
      description: i.string().optional(),
      notes: i.string().optional(),
      inspectionType: i.string().indexed(),
      category: i.string().indexed(),
      owner: i.string().indexed(), // UID
      involved: i.json().optional(), // Array of UIDs
      dueAt: i.string().indexed(), // ISO date only
      dueAtTime: i.string().optional(), // HH:MM
      completedAt: i.number().indexed().optional(),
      comments: i.json().optional(), // Array of Comment objects
      customFieldDefinitions: i.json().optional(), // Array of TaskCustomField
      customFieldValues: i.json().optional(), // Record<fieldID, value>
      files: i.json().optional(), // Array of FileIDs
      tracked: i.string().indexed(), // true | 'facility' | false
      overdue: i.boolean().indexed().optional(), // Cached
      taskNeedsCorrectiveAction: i.boolean().optional(),
      displayNumber: i.number().optional(),
      // Timestamps
      createdAt: i.number().optional(),
      createdBy: i.string().optional(),
      updatedAt: i.number().optional(),
      updatedBy: i.string().optional(),
      deletedAt: i.number().optional(),
      deletedBy: i.string().optional(),
    }),

    // ========================================================================
    // ECMS External Tasks
    // ========================================================================

    externalTasks: i.entity({
      externalTaskID: i.string().unique().indexed(),
      type: i.string().indexed(), // applicableStandard, permitRenewal, etc.
      standardTaskIds: i.json().optional(),
      facilityID: i.string().indexed(),
      title: i.string(),
      description: i.string().optional(),
      tracked: i.string().indexed(),
      importedAs: i.string().indexed().optional(), // TaskID
      notApplicableBecause: i.string().optional(),
      markedTasksAsCompleteAt: i.number().optional(),
      data: i.json().optional(), // Type-specific data
      createdAt: i.number().optional(),
      updatedAt: i.number().optional(),
    }),

    // ========================================================================
    // ECMS Files & Folders
    // ========================================================================

    folders: i.entity({
      folderID: i.string().unique().indexed(),
      facilityID: i.string().indexed(),
      name: i.string(),
      parentFolderIDs: i.json().optional(), // Array of FolderIDs
      isSystemGenerated: i.boolean().optional(),
      // Timestamps
      createdAt: i.number().optional(),
      createdBy: i.string().optional(),
      updatedAt: i.number().optional(),
      updatedBy: i.string().optional(),
      deletedAt: i.number().optional(),
      deletedBy: i.string().optional(),
    }),

    ecmsFiles: i.entity({
      fileID: i.string().unique().indexed(),
      facilityID: i.string().indexed().optional(),
      name: i.string(),
      contentType: i.string(),
      sizeInBytes: i.number(),
      sizeForHumans: i.string(),
      type: i.string().indexed(), // firebase, external, sharepoint
      firebaseStoragePath: i.string().optional(),
      externalUrl: i.string().optional(),
      sharepointId: i.string().optional(),
      sharepointDriveId: i.string().optional(),
      createdFor: i.json().optional(), // CreatedFor union
      createdForCustomFieldID: i.string().optional(),
      createdFromFileID: i.string().optional(),
      // Timestamps
      createdAt: i.number().optional(),
      createdBy: i.string().optional(),
      deletedAt: i.number().optional(),
      deletedBy: i.string().optional(),
    }),

    // ========================================================================
    // ECMS Audit Logs
    // ========================================================================

    auditLogs: i.entity({
      auditLogItemID: i.string().unique().indexed(),
      type: i.string().indexed(), // logged action type
      // Entity references
      taskID: i.string().indexed().optional(),
      taskGeneratorID: i.string().indexed().optional(),
      taskTemplateID: i.string().indexed().optional(),
      facilityID: i.string().indexed().optional(),
      userID: i.string().indexed().optional(),
      roleID: i.string().indexed().optional(),
      folderID: i.string().indexed().optional(),
      externalTaskID: i.string().indexed().optional(),
      // Action details
      description: i.string(),
      details: i.json().optional(),
      before: i.json().optional(),
      after: i.json().optional(),
      // Timestamps
      createdAt: i.number().indexed(),
      createdBy: i.string().indexed(),
    }),

    // ========================================================================
    // ECMS Notifications
    // ========================================================================

    notifications: i.entity({
      notificationLogItemID: i.string().unique().indexed(),
      taskID: i.string().indexed().optional(),
      taskGeneratorID: i.string().indexed().optional(),
      taskTemplateID: i.string().indexed().optional(),
      facilityID: i.string().indexed().optional(),
      scheduleID: i.string().optional(),
      scheduleNotificationID: i.string().optional(),
      actionType: i.string().indexed(),
      intendedSentAt: i.number().indexed(),
      sentAt: i.number().indexed().optional(),
      to: i.json(), // Array of email addresses
      cc: i.json().optional(),
      bcc: i.json().optional(),
      replyTo: i.string().optional(),
      subject: i.string(),
      body: i.string(),
      htmlBody: i.string(),
      readBy: i.json().optional(), // Array of UIDs
      unreadBy: i.json().optional(), // Array of UIDs
      users: i.json(), // Array of UIDs
    }),

    dailyDigests: i.entity({
      digestSentID: i.string().unique().indexed(),
      userID: i.string().indexed(),
      events: i.json(), // Array of DailyDigestEvent
      sentAt: i.number().indexed(),
      notificationLogItemID: i.string().optional(),
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
    // ECMS Links
    // ========================================================================

    facilityRoles: {
      forward: {
        on: 'facilities',
        has: 'many',
        label: 'roles',
      },
      reverse: {
        on: 'roles',
        has: 'one',
        label: 'facility',
      },
    },

    facilityTasks: {
      forward: {
        on: 'facilities',
        has: 'many',
        label: 'tasks',
      },
      reverse: {
        on: 'tasks',
        has: 'one',
        label: 'facility',
      },
    },

    facilityTaskGenerators: {
      forward: {
        on: 'facilities',
        has: 'many',
        label: 'taskGenerators',
      },
      reverse: {
        on: 'taskGenerators',
        has: 'one',
        label: 'facility',
      },
    },

    facilityExternalTasks: {
      forward: {
        on: 'facilities',
        has: 'many',
        label: 'externalTasks',
      },
      reverse: {
        on: 'externalTasks',
        has: 'one',
        label: 'facility',
      },
    },

    facilityFolders: {
      forward: {
        on: 'facilities',
        has: 'many',
        label: 'folders',
      },
      reverse: {
        on: 'folders',
        has: 'one',
        label: 'facility',
      },
    },

    taskTemplateTasks: {
      forward: {
        on: 'taskTemplates',
        has: 'many',
        label: 'tasks',
      },
      reverse: {
        on: 'tasks',
        has: 'one',
        label: 'taskTemplate',
      },
    },

    taskTemplateGenerators: {
      forward: {
        on: 'taskTemplates',
        has: 'many',
        label: 'generators',
      },
      reverse: {
        on: 'taskGenerators',
        has: 'one',
        label: 'taskTemplate',
      },
    },

    taskGeneratorTasks: {
      forward: {
        on: 'taskGenerators',
        has: 'many',
        label: 'tasks',
      },
      reverse: {
        on: 'tasks',
        has: 'one',
        label: 'generator',
      },
    },

    taskAuditLogs: {
      forward: {
        on: 'tasks',
        has: 'many',
        label: 'auditLogs',
      },
      reverse: {
        on: 'auditLogs',
        has: 'one',
        label: 'task',
      },
    },

    taskNotifications: {
      forward: {
        on: 'tasks',
        has: 'many',
        label: 'notifications',
      },
      reverse: {
        on: 'notifications',
        has: 'one',
        label: 'task',
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
