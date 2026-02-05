/**
 * ECMS External Task Types
 * Integration with external systems (FES, NEU, BOLCC, etc.)
 */

import type {
  ExternalTaskID,
  FacilityID,
  TaskTemplateID,
  ISO8601DateOnly,
  Timestamp,
  TrackedStatus,
  TaskID,
} from './common';

// ============================================================================
// External Task Base
// ============================================================================

export interface ExternalTaskBase {
  externalTaskID: ExternalTaskID;
  standardTaskIds: string[];
  facility: FacilityID;
  title: string;
  description: string;
  tracked: TrackedStatus;
  importedAs?: TaskID; // If imported into ECMS as a task
  notApplicableBecause?: string; // If rejected/not applicable
  markedTasksAsCompleteAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// 1. Applicable Standard Task
// ============================================================================

export interface ApplicableStandardTask extends ExternalTaskBase {
  type: 'applicableStandard';
  taskTemplateID: TaskTemplateID;
  versionID: string;
  unitName?: string;
}

// ============================================================================
// 2. AppTool Compliance Issue
// ============================================================================

export interface ComplianceIssue {
  program: string;
  standard: string;
  question: string;
  answer: string;
}

export interface AppToolComplianceIssueTask extends ExternalTaskBase {
  type: 'appToolComplianceIssue';
  issue: ComplianceIssue;
}

// ============================================================================
// 3. Permit Renewal
// ============================================================================

export interface PermitDetails {
  permitID: string;
  permitNumber: string;
  permitType: string;
  issuingAuthority: string;
  expirationDate: ISO8601DateOnly;
}

export interface PermitRenewalExternalTask extends ExternalTaskBase {
  type: 'permitRenewal';
  dueAt: ISO8601DateOnly;
  permit: PermitDetails;
}

// ============================================================================
// 4. Permit Issued
// ============================================================================

export interface PermitIssuedExternalTask extends ExternalTaskBase {
  type: 'permitIssued';
  dueAt: ISO8601DateOnly;
  permit: PermitDetails;
}

// ============================================================================
// 5. Vendor Audit
// ============================================================================

export interface VendorAuditDetails {
  vendorName: string;
  auditType: string;
  mediaType: string;
  quarter: string;
  year: number;
}

export interface VendorAuditExternalTask extends ExternalTaskBase {
  type: 'vendorAudit';
  dueAt: ISO8601DateOnly;
  audit: VendorAuditDetails;
}

export interface VendorAuditFacilityVariant extends ExternalTaskBase {
  type: 'vendorAuditFacility';
  dueAt: ISO8601DateOnly;
  audit: VendorAuditDetails;
}

// ============================================================================
// 6. FES Audit
// ============================================================================

export interface FesAudit {
  auditID: string;
  auditName: string;
  auditURL: string;
  stage: 'pre' | 'during' | 'post';
  yellowFindings: number;
  redFindings: number;
  totalFindings: number;
  startDate: ISO8601DateOnly;
  endDate: ISO8601DateOnly;
}

export interface FesAuditExternalTask extends ExternalTaskBase {
  type: 'fesAudit';
  dueAt: ISO8601DateOnly;
  deliverable: string;
  audit: FesAudit;
  isEligibleForBasicAdvancement: boolean;
  scheduleTaskInto: 'facility' | 'corporate';
}

// FES Audit Intra-Stage Tasks
export interface FesAuditIntraStageCounselCall extends ExternalTaskBase {
  type: 'fesAuditIntraStageCounselCall';
  dueAt: ISO8601DateOnly;
  audit: FesAudit;
}

export interface FesAuditIntraStageYellowFindingsResolved extends ExternalTaskBase {
  type: 'fesAuditIntraStageYellowFindingsResolved';
  dueAt: ISO8601DateOnly;
  audit: FesAudit;
}

export interface FesAuditIntraStageRedFindingsResolved extends ExternalTaskBase {
  type: 'fesAuditIntraStageRedFindingsResolved';
  dueAt: ISO8601DateOnly;
  audit: FesAudit;
}

export interface FesAuditIntraStageAllFindingsResolved extends ExternalTaskBase {
  type: 'fesAuditIntraStageAllFindingsResolved';
  dueAt: ISO8601DateOnly;
  audit: FesAudit;
}

// ============================================================================
// 7. BOLCC Assessment
// ============================================================================

export interface BolccAssessmentDetails {
  assessmentID: string;
  assessmentName: string;
  year: number;
  quarter: string;
}

export interface BolccAssessmentExternalTask extends ExternalTaskBase {
  type: 'bolccAssessment';
  dueAt: ISO8601DateOnly;
  assessment: BolccAssessmentDetails;
}

// ============================================================================
// 8. NEU Assignment (Training)
// ============================================================================

export interface NeuCourse {
  courseID: string;
  title: string;
  courseURL: string;
  courseExternalID: string;
}

export interface NeuAssignment {
  assignmentID: string;
  dueAt: ISO8601DateOnly;
  completedAt?: Timestamp;
}

export interface NeuUserConfig {
  userID: string;
  neuUserID: string;
  email: string;
}

export interface NeuAssignmentExternalTask extends ExternalTaskBase {
  type: 'neuAssignment';
  dueAt: ISO8601DateOnly;
  assignment: NeuAssignment;
  course: NeuCourse;
  user: NeuUserConfig;
}

// ============================================================================
// 9. Permit Indexing
// ============================================================================

export interface PermitIndexingExternalTask extends ExternalTaskBase {
  type: 'permitIndexing';
  permitIndexID: string;
}

// ============================================================================
// 10. Permit Condition
// ============================================================================

export interface PermitConditionExternalTask extends ExternalTaskBase {
  type: 'permitCondition';
  permitIndexID: string;
  conditionID: string;
}

// ============================================================================
// Union Type
// ============================================================================

export type ExternalTask =
  | ApplicableStandardTask
  | AppToolComplianceIssueTask
  | PermitRenewalExternalTask
  | PermitIssuedExternalTask
  | VendorAuditExternalTask
  | VendorAuditFacilityVariant
  | FesAuditExternalTask
  | FesAuditIntraStageCounselCall
  | FesAuditIntraStageYellowFindingsResolved
  | FesAuditIntraStageRedFindingsResolved
  | FesAuditIntraStageAllFindingsResolved
  | BolccAssessmentExternalTask
  | NeuAssignmentExternalTask
  | PermitIndexingExternalTask
  | PermitConditionExternalTask;
