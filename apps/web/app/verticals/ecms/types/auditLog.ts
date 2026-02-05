/**
 * ECMS Audit Log Types
 * Comprehensive audit trail for all entity changes
 */

import type {
  TaskID,
  TaskGeneratorID,
  TaskTemplateID,
  FacilityID,
  UID,
  RoleID,
  FolderID,
  Timestamp,
} from './common';

// ============================================================================
// Logged Action Types
// ============================================================================

export type LoggedActionType =
  // Task actions
  | 'task-created'
  | 'task-updated'
  | 'task-deleted'
  | 'task-completed'
  | 'task-uncompleted'
  | 'task-owner-changed'
  | 'task-due-date-changed'
  | 'task-comment-added'
  | 'task-file-added'
  | 'task-file-removed'
  | 'task-custom-field-updated'
  // Task Generator actions
  | 'task-generator-created'
  | 'task-generator-updated'
  | 'task-generator-deleted'
  | 'task-generator-schedule-changed'
  | 'task-generator-paused'
  | 'task-generator-resumed'
  // Task Template actions
  | 'task-template-created'
  | 'task-template-updated'
  | 'task-template-deleted'
  | 'task-template-published'
  // Role actions
  | 'role-created'
  | 'role-updated'
  | 'role-deleted'
  | 'role-user-added'
  | 'role-user-removed'
  // Folder actions
  | 'folder-created'
  | 'folder-updated'
  | 'folder-deleted'
  | 'folder-moved'
  // User actions
  | 'user-created'
  | 'user-updated'
  | 'user-deactivated'
  | 'user-reactivated'
  // Facility actions
  | 'facility-config-updated'
  | 'facility-activated'
  | 'facility-deactivated'
  // External Task actions
  | 'external-task-imported'
  | 'external-task-rejected'
  | 'external-task-completed'
  // Other
  | 'system-migration'
  | 'bulk-operation';

// ============================================================================
// Audit Log Item
// ============================================================================

export interface AuditLogItem {
  auditLogItemID: `ali_${string}`;
  type: LoggedActionType;

  // Entity references
  taskID?: TaskID;
  taskGeneratorID?: TaskGeneratorID;
  taskTemplateID?: TaskTemplateID;
  facility?: FacilityID;
  userID?: UID;
  roleID?: RoleID;
  folderID?: FolderID;
  externalTaskID?: string;

  // Action details
  description: string;
  details?: Record<string, any>; // Custom metadata for the action

  // Change tracking
  before?: Record<string, any>; // State before change
  after?: Record<string, any>; // State after change

  // Timestamps
  createdAt: Timestamp;
  createdBy: UID;
}

// ============================================================================
// Audit Log Query
// ============================================================================

export interface AuditLogQuery {
  entityType?: 'task' | 'taskGenerator' | 'taskTemplate' | 'role' | 'user' | 'facility';
  entityID?: string;
  actionTypes?: LoggedActionType[];
  userID?: UID;
  facilityID?: FacilityID;
  startDate?: Timestamp;
  endDate?: Timestamp;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Audit Log Summary
// ============================================================================

export interface AuditLogSummary {
  totalActions: number;
  actionsByType: Record<LoggedActionType, number>;
  actionsByUser: Record<UID, number>;
  actionsByFacility: Record<FacilityID, number>;
  recentActions: AuditLogItem[];
}
