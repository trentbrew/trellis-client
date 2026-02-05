/**
 * ECMS Task Types
 * Three-tier task management system: Template → Generator → Task
 */

import type {
  TaskID,
  TaskTemplateID,
  TaskGeneratorID,
  FacilityID,
  UID,
  ISO8601DateOnly,
  ISO8601HoursAndMinutes,
  Timestamp,
  StandardTimestamps,
  PartialTimestamps,
  Branch,
  TrackedStatus,
  InspectionType,
  TaskCategory,
  Duration,
  DateWithTimeZone,
  Comment,
  UserRoleConfig,
  FolderID,
  FileID,
} from './common';
import type { TaskCustomField, TaskCustomFieldValue } from './customFields';
import type { SharepointFolder } from './facilities';

// ============================================================================
// Schedule & Notifications
// ============================================================================

export type NotifyGrouping = 'digest' | 'escalations-separate' | 'separate';

export interface ScheduleNotification {
  scheduleNotificationID: string;
  when: Duration; // Relative to due date
  users?: UID[];
  emails?: string[];
  escalationLevel?: number;
}

export interface Schedule extends PartialTimestamps {
  scheduleID: `schedule_${string}`;
  frequency: Duration; // How often tasks are generated
  create: Duration; // When to create relative to due date (typically negative)
  notifyOnCreate: boolean;
  notifyOnDue: boolean;
  notifyHoursBeforeDue?: number;
  notifyGrouping: NotifyGrouping;
  generateOnlyOnCompletion?: boolean;
  notifications: ScheduleNotification[];
  limit?: number; // Maximum number of occurrences
  dueAtFirst: DateWithTimeZone; // First due date
}

export interface ScheduleTemplate {
  scheduleTemplateID: string;
  frequency: Duration;
  create: Duration;
  notifyOnCreate: boolean;
  notifyOnDue: boolean;
  notifyHoursBeforeDue?: number;
  notifyGrouping: NotifyGrouping;
  generateOnlyOnCompletion?: boolean;
  notifications: ScheduleNotification[];
}

// ============================================================================
// Task Template
// ============================================================================

export interface TaskTemplate extends StandardTimestamps {
  taskTemplateID: TaskTemplateID;
  standardTaskIds: string[]; // IDs from standard task library
  branches: Branch[];
  title: string;
  description: string;
  tracked: TrackedStatus;
  schedules: ScheduleTemplate[];
  isFacilityScheduleChoiceAvailable: boolean;
  inspectionType: InspectionType;
  category: TaskCategory;
  owner: Record<FacilityID, UID>; // Owner per facility
  involved: Record<FacilityID, UID[]>; // Involved users per facility
  facilities: FacilityID[];
  customFieldDefinitions: TaskCustomField[];
  canGeneratorsCustomizeFields: boolean;
  editableBy: (FacilityID | UID)[]; // Who can edit this template
  isStandardTaskTemplate: boolean;
}

// ============================================================================
// Task Generator
// ============================================================================

export interface TaskGenerator extends StandardTimestamps {
  taskGeneratorID: TaskGeneratorID;
  taskTemplateID: TaskTemplateID | null; // Null for one-off generators
  facility: FacilityID;
  title: string;
  description: string;
  tracked: TrackedStatus;
  schedule: Schedule; // Fully configured schedule
  inspectionType: InspectionType;
  category: TaskCategory;
  owner: UID;
  involved: UID[];
  ownerConfigured?: UserRoleConfig; // Role-based assignment
  involvedConfigured?: UserRoleConfig[]; // Role-based assignment
  parentFolderIDs: FolderID[];
  sharepointFolder?: SharepointFolder;
  customFieldDefinitions: TaskCustomField[];
  standardTaskIds: string[];
  branches: Branch[];
  dontGenerateTasksBefore?: ISO8601DateOnly;
  dueDateAdjustments: Record<ISO8601DateOnly, ISO8601DateOnly>; // Manual adjustments
  dueDatesExcluded: ISO8601DateOnly[]; // Skipped dates
  externalTaskIDs: string[]; // Associated external tasks
  isDone?: boolean; // Cached completion status
  permit?: string; // Associated permit ID
  fesAudit?: string; // Associated FES audit ID
  enforcementAction?: string; // Associated enforcement action ID
  correctiveActionFor?: TaskID; // If this is a corrective action
  selfAssessmentGoal?: string; // Self-assessment goal ID
  neuAssignmentID?: string; // NEU assignment ID
}

// ============================================================================
// Task
// ============================================================================

export interface Task extends StandardTimestamps {
  taskID: TaskID;
  taskTemplateID: TaskTemplateID | null; // Null for one-off tasks
  taskGeneratorID: TaskGeneratorID;
  facility: FacilityID;
  title: string;
  description: string;
  notes?: string; // Additional notes added to specific task instance
  inspectionType: InspectionType;
  category: TaskCategory;
  owner: UID;
  involved: UID[];
  dueAt: ISO8601DateOnly;
  dueAtTime?: ISO8601HoursAndMinutes;
  completedAt: Timestamp | null;
  comments: Comment[];
  customFieldDefinitions: TaskCustomField[];
  customFieldValues: Record<string, TaskCustomFieldValue>;
  files: FileID[];
  tracked: TrackedStatus;
  overdue: boolean; // Cached for performance
  taskNeedsCorrectiveAction?: boolean;
  displayNumber?: number; // Sequential display number for UI
}

// ============================================================================
// Task Statistics (for KPI reporting)
// ============================================================================

export interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completedOnTime: number;
  completedLate: number;
  avgDaysToComplete: number;
  byCategory: Record<TaskCategory, number>;
  byInspectionType: Record<InspectionType, number>;
}
