/**
 * ECMS Notification Types
 * Notification system with digests and escalations
 */

import type {
  TaskID,
  TaskGeneratorID,
  TaskTemplateID,
  FacilityID,
  UID,
  Timestamp,
  ISO8601DateOnly,
  Branch,
  TrackedStatus,
} from './common';

// ============================================================================
// Task Notification
// ============================================================================

export interface TaskNotification {
  taskNotificationID: `tn_${string}`;
  taskID: TaskID;
  date: ISO8601DateOnly;
  scheduleID: string;
  scheduleNotificationID: string;
  escalations?: {
    level: number;
    users: UID[];
    emails: string[];
  }[];
  users: UID[];
  emails: string[];
  type: 'expected' | 'sent' | 'failed';
  sentAt?: Timestamp;
  failedAt?: Timestamp;
  failureReason?: string;
}

// ============================================================================
// Notification Log
// ============================================================================

export interface NotificationLogItem {
  notificationLogItemID: `nli_${string}`;
  taskID?: TaskID;
  taskGeneratorID?: TaskGeneratorID;
  taskTemplateID?: TaskTemplateID;
  facility?: FacilityID;
  scheduleID?: string;
  scheduleNotificationID?: string;
  actionType: string;
  intendedSentAt: Timestamp;
  sentAt?: Timestamp;
  to: string[];
  cc: string[];
  bcc: string[];
  replyTo?: string;
  subject: string;
  body: string;
  htmlBody: string;
  readBy: UID[];
  unreadBy: UID[];
  users: UID[];
}

// ============================================================================
// Daily Digest Events
// ============================================================================

export type DigestEventType =
  | 'task-created'
  | 'task-due'
  | 'task-reminder'
  | 'task-escalation'
  | 'task-will-escalate'
  | 'task-overdue'
  | 'task-completed'
  | 'task-updated'
  | 'permitApplicationStatusUpdated';

export interface DailyDigestEventBase {
  digestEventID: `de_${string}`;
  users: UID[];
  facility: FacilityID;
  description: string;
  emittedAt: Timestamp;
}

export interface DailyDigestEventTask extends DailyDigestEventBase {
  type: 'task';
  taskID: TaskID;
  taskBranches: Branch[];
  taskTitle: string;
  taskOwner: UID;
  taskDueAt: ISO8601DateOnly;
  taskTracked: TrackedStatus;
  eventType: DigestEventType;
}

export interface DailyDigestEventPas extends DailyDigestEventBase {
  type: 'permitApplicationStatus';
  permitApplicationStatusID: string;
  title: string;
  fesCategory: string;
  notes: string;
  eventType: 'permitApplicationStatusUpdated';
}

export type DailyDigestEvent = DailyDigestEventTask | DailyDigestEventPas;

// ============================================================================
// Email Daily Digest Sent
// ============================================================================

export interface EmailDailyDigestSent {
  digestSentID: `ds_${string}`;
  userID: UID;
  events: DailyDigestEvent[];
  sentAt: Timestamp;
  notificationLogItemID: string;
}
