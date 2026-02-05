/**
 * ECMS Common Types
 * Shared type definitions used across ECMS entities
 */

// ============================================================================
// ID Types
// ============================================================================

export type UID = `uid_${string}`;
export type FacilityID = `facility_${string}`;
export type TaskID = `task_${string}`;
export type TaskTemplateID = `template_${string}`;
export type TaskGeneratorID = `generator_${string}`;
export type RoleID = `role_${string}`;
export type FileID = `file_${string}`;
export type FolderID = `folder_${string}`;
export type ExternalTaskID = `external_task_${string}`;

// ============================================================================
// Timestamp Types
// ============================================================================

export type ISO8601DateOnly = string; // YYYY-MM-DD
export type ISO8601HoursAndMinutes = string; // HH:MM
export type ISO8601YearAndMonthOnly = string; // YYYY-MM
export type Timestamp = number; // Milliseconds since epoch
export type DateWithTimeZone = {
  date: ISO8601DateOnly;
  time?: ISO8601HoursAndMinutes;
  timeZone: string;
};

// ============================================================================
// Standard Timestamp Fields
// ============================================================================

export interface StandardTimestamps {
  createdAt: Timestamp;
  createdBy: UID;
  updatedAt: Timestamp;
  updatedBy: UID;
  deletedAt?: Timestamp;
  deletedBy?: UID;
}

export interface PartialTimestamps {
  createdAt: Timestamp;
  createdBy: UID;
  updatedAt: Timestamp;
  updatedBy: UID;
}

// ============================================================================
// Branches
// ============================================================================

export type Branch = 'environmental' | 'safety';

// ============================================================================
// Tracked Status
// ============================================================================

export type TrackedStatus = true | 'facility' | false;

// ============================================================================
// Media Types
// ============================================================================

export type MediaType =
  | 'Air'
  | 'Water'
  | 'Waste'
  | 'HazMat'
  | 'Miscellaneous'
  | 'Training'
  | 'Corporate';

// ============================================================================
// Inspection Types
// ============================================================================

export type InspectionType =
  // Environmental
  | 'Calibration'
  | 'Fee'
  | 'Inspection'
  | 'Monitoring'
  | 'New Permit'
  | 'Notification'
  | 'Other'
  | 'Permit Renewal'
  | 'Plan'
  | 'Registration'
  | 'Report'
  | 'Safety'
  | 'Testing'
  | 'Training'
  | 'Update/Review'
  // Safety
  | 'Audit'
  | 'Emergency Drill'
  | 'Equipment Inspection'
  | 'Hazard Assessment'
  | 'Incident Investigation'
  | 'Job Safety Analysis'
  | 'Medical Surveillance'
  | 'Permit to Work'
  | 'Risk Assessment'
  | 'Safety Meeting'
  | 'Safety Training'
  | 'Self-Inspection'
  | 'Third-Party Inspection'
  | 'Workplace Inspection';

// ============================================================================
// Task Categories
// ============================================================================

export type TaskCategory =
  // Environmental
  | 'Air'
  | 'Corp'
  | 'DOT'
  | 'EMS'
  | 'EPCRA'
  | 'Maintenance'
  | 'Other'
  | 'Radiation'
  | 'Safety'
  | 'SPCC'
  | 'Waste'
  | 'Water'
  // Safety
  | 'Chemical Safety'
  | 'Electrical Safety'
  | 'Emergency Preparedness'
  | 'Ergonomics'
  | 'Fall Protection'
  | 'Fire Safety'
  | 'General Safety'
  | 'Hazard Communication'
  | 'Industrial Hygiene'
  | 'Lockout/Tagout'
  | 'Machine Guarding'
  | 'PPE'
  | 'Process Safety'
  | 'Respiratory Protection'
  | 'Vehicle Safety'
  | 'Workplace Violence Prevention';

// ============================================================================
// Duration
// ============================================================================

export interface Duration {
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
  locationInWeek?: number; // 1-7 (Monday-Sunday)
  locationInMonth?: number; // 1-31
}

// ============================================================================
// Address
// ============================================================================

export interface Address {
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

// ============================================================================
// Comment
// ============================================================================

export interface Comment {
  commentID: string;
  writtenBy: UID;
  writtenAt: Timestamp;
  content: string;
}

// ============================================================================
// Escalation
// ============================================================================

export interface EscalationItem {
  roleID?: RoleID;
  users?: UID[];
  escalates?: Duration;
  mustBeAssignedToEscalate?: boolean;
}

// ============================================================================
// User Config
// ============================================================================

export interface UserRoleConfig {
  role?: RoleID;
  users?: UID[];
}
