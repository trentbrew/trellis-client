/**
 * ECMS Custom Field Types
 * Specialized field types for task customization
 */

import type {
  FileID,
  FacilityID,
  TaskID,
  TaskTemplateID,
  TaskGeneratorID,
  Timestamp,
} from './common';

// ============================================================================
// Custom Field Common
// ============================================================================

export interface TaskCustomFieldCommon {
  fieldID: `cf_${string}`;
  label: string;
  helpText?: string;
}

// ============================================================================
// Basic Custom Fields
// ============================================================================

export interface TaskCustomFieldText extends TaskCustomFieldCommon {
  type: 'text';
}

export interface TaskCustomFieldTextarea extends TaskCustomFieldCommon {
  type: 'textarea';
}

export interface TaskCustomFieldSelect extends TaskCustomFieldCommon {
  type: 'select';
  options: string[];
  multiple?: boolean;
}

export interface TaskCustomFieldDate extends TaskCustomFieldCommon {
  type: 'date';
}

export interface TaskCustomFieldCheckbox extends TaskCustomFieldCommon {
  type: 'checkbox';
}

// ============================================================================
// File & Image Fields
// ============================================================================

export type FileMode = 'template' | 'persistent';

export interface TaskCustomFieldFile extends TaskCustomFieldCommon {
  type: 'file';
  mode: FileMode;
  directories?: string[]; // Suggested directories for organization
}

export interface TaskCustomFieldImage extends TaskCustomFieldCommon {
  type: 'image';
  multiple?: boolean;
}

// ============================================================================
// Method 9 Observations
// ============================================================================

export interface Method9Stage {
  stageID: string;
  name: string;
  startIndex: number;
  endIndex: number;
}

export interface TaskCustomFieldMethod9 extends TaskCustomFieldCommon {
  type: 'method9';
  stages?: Method9Stage[];
}

// ============================================================================
// Permit Status Confirmation
// ============================================================================

export interface TaskCustomFieldConfirmPermitStatus extends TaskCustomFieldCommon {
  type: 'confirmPermitStatus';
}

// ============================================================================
// KPI (Key Performance Indicators)
// ============================================================================

export interface TaskCustomFieldKpi extends TaskCustomFieldCommon {
  type: 'kpi';
}

// ============================================================================
// Enforcement Action
// ============================================================================

export interface TaskCustomFieldEnforcementAction extends TaskCustomFieldCommon {
  type: 'enforcementAction';
}

// ============================================================================
// File Review
// ============================================================================

export interface TaskCustomFieldFileReview extends TaskCustomFieldCommon {
  type: 'fileReview';
}

// ============================================================================
// Permit Application Status
// ============================================================================

export interface TaskCustomFieldPermitApplicationStatus extends TaskCustomFieldCommon {
  type: 'permitApplicationStatus';
}

// ============================================================================
// Regulatory Reporting
// ============================================================================

export interface TaskCustomFieldRegulatoryReport extends TaskCustomFieldCommon {
  type: 'regulatoryReport';
  isDraft?: boolean;
}

// ============================================================================
// Self Assessment
// ============================================================================

export interface TaskCustomFieldSelfAssessment extends TaskCustomFieldCommon {
  type: 'selfAssessment';
}

// ============================================================================
// Determination
// ============================================================================

export interface TaskCustomFieldDetermination extends TaskCustomFieldCommon {
  type: 'determination';
}

// ============================================================================
// Repeater (Repeating Field Groups)
// ============================================================================

export interface TaskCustomFieldRepeaterInstance {
  instanceID: string;
  fields: Record<string, any>;
  createdAt: Timestamp;
}

export interface TaskCustomFieldRepeater extends TaskCustomFieldCommon {
  type: 'repeater';
  fields: TaskCustomField[]; // Nested fields that repeat
  minInstances?: number;
  maxInstances?: number;
}

// ============================================================================
// Union Type
// ============================================================================

export type TaskCustomField =
  | TaskCustomFieldText
  | TaskCustomFieldTextarea
  | TaskCustomFieldSelect
  | TaskCustomFieldDate
  | TaskCustomFieldCheckbox
  | TaskCustomFieldFile
  | TaskCustomFieldImage
  | TaskCustomFieldMethod9
  | TaskCustomFieldConfirmPermitStatus
  | TaskCustomFieldKpi
  | TaskCustomFieldEnforcementAction
  | TaskCustomFieldFileReview
  | TaskCustomFieldPermitApplicationStatus
  | TaskCustomFieldRegulatoryReport
  | TaskCustomFieldSelfAssessment
  | TaskCustomFieldDetermination
  | TaskCustomFieldRepeater;

// ============================================================================
// Custom Field Values
// ============================================================================

export type TaskCustomFieldValue =
  | string // text, textarea, select
  | string[] // select (multiple), repeater
  | boolean // checkbox
  | FileID // file, image
  | FileID[] // file (multiple), image (multiple)
  | TaskCustomFieldRepeaterInstance[] // repeater
  | any; // Complex types (method9, kpi, etc.)
