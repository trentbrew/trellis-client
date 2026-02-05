/**
 * ECMS File Management Types
 * Multi-source file system with folders
 */

import type {
  FileID,
  FolderID,
  FacilityID,
  UID,
  Timestamp,
  StandardTimestamps,
  TaskID,
  TaskGeneratorID,
  TaskTemplateID,
} from './common';

// ============================================================================
// File Created For
// ============================================================================

export type FileCreatedFor =
  | { type: 'task'; taskID: TaskID }
  | { type: 'taskGenerator'; taskGeneratorID: TaskGeneratorID }
  | { type: 'taskTemplate'; taskTemplateID: TaskTemplateID }
  | { type: 'kpi'; kpiID: string }
  | { type: 'enforcementAction'; enforcementActionID: string }
  | { type: 'permitApplicationStatus'; permitApplicationStatusID: string }
  | { type: 'cea'; ceaQuestionnaireID: string };

// ============================================================================
// ECMS File Base
// ============================================================================

export interface EcmsFileBase {
  fileID: FileID;
  facility?: FacilityID;
  name: string;
  contentType: string;
  sizeInBytes: number;
  sizeForHumans: string; // e.g., "2.4 MB"
  createdAt: Timestamp;
  createdBy: UID;
  deletedAt?: Timestamp;
  deletedBy?: UID;
  createdFor: FileCreatedFor;
  createdForCustomFieldID?: string;
  createdFromFileID?: FileID; // If copied from another file
}

// ============================================================================
// ECMS File Variants
// ============================================================================

export interface EcmsFileFirebase extends EcmsFileBase {
  type: 'firebase';
  firebaseStoragePath: string;
}

export interface EcmsFileExternal extends EcmsFileBase {
  type: 'external';
  externalUrl: string;
}

export interface EcmsFileSharepoint extends EcmsFileBase {
  type: 'sharepoint';
  sharepointId: string;
  sharepointDriveId: string;
}

export type EcmsFile = EcmsFileFirebase | EcmsFileExternal | EcmsFileSharepoint;

// ============================================================================
// ECMS Folder
// ============================================================================

export interface EcmsFolder extends StandardTimestamps {
  folderID: FolderID;
  facility: FacilityID;
  name: string;
  parentFolderIDs: FolderID[];
  isSystemGenerated?: boolean;
}

// ============================================================================
// File Review System
// ============================================================================

export type FileReviewFileStatus =
  | { status: 'unreviewed' }
  | { status: 'affirmed'; affirmedAt: Timestamp; affirmedBy: UID }
  | { status: 'uploaded'; uploadedAt: Timestamp; uploadedBy: UID; fileID: FileID }
  | { status: 'updated'; updatedAt: Timestamp; updatedBy: UID; fileID: FileID }
  | { status: 'archived'; archivedAt: Timestamp; archivedBy: UID; reason: string }
  | { status: 'replaced'; replacedAt: Timestamp; replacedBy: UID; fileID: FileID }
  | { status: 'missing'; markedMissingAt: Timestamp; markedMissingBy: UID };

export type FileReviewCategoryStatus =
  | { status: 'unreviewed' }
  | { status: 'missing'; markedMissingAt: Timestamp; markedMissingBy: UID }
  | { status: 'affirmed'; affirmedAt: Timestamp; affirmedBy: UID };

export interface FileReviewFile {
  fileID: FileID;
  fileName: string;
  category: string;
  status: FileReviewFileStatus;
}

export interface FileReviewCategory {
  categoryID: string;
  categoryName: string;
  status: FileReviewCategoryStatus;
}

export interface FileReview {
  fileReviewID: `file_review_${string}`;
  facilityID: FacilityID;
  createdFor:
    | { type: 'one-off' }
    | { type: 'task'; taskID: TaskID }
    | { type: 'determination'; determinationID: string };
  categories: Record<string, FileReviewCategory>;
  files: Record<FileID, FileReviewFile>;
  completedAt?: Timestamp;
  completedBy?: UID;
  createdAt: Timestamp;
  createdBy: UID;
  updatedAt: Timestamp;
  updatedBy: UID;
}
