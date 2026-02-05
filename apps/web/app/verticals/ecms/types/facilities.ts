/**
 * ECMS Facility Types
 * Types related to facility management and configuration
 */

import type {
  FacilityID,
  StandardTimestamps,
  Address,
} from './common';

// ============================================================================
// Facility
// ============================================================================

export interface Facility extends Address {
  facilityID: FacilityID;
  facility: string; // Display name
  abbr: string; // Abbreviation
  group: string; // Facility group
  active: boolean;
  djj: string; // DJJ identifier
  folder: string; // Folder name for file organization
  isSynthetic?: boolean; // Whether this is a synthetic/test facility
}

// ============================================================================
// Facility Config
// ============================================================================

export interface SharepointFolder {
  driveId: string;
  folderId: string;
  folderName: string;
  webUrl: string;
}

export interface FacilityConfig extends StandardTimestamps {
  facilityID: FacilityID;
  timeZone: string; // IANA timezone string (e.g., 'America/New_York')
  sharepointFolder?: SharepointFolder;
}

// ============================================================================
// Facility Group
// ============================================================================

export interface FacilityGroup {
  groupID: string;
  name: string;
  facilities: FacilityID[];
  description?: string;
}
