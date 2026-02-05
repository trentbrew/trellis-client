/**
 * ECMS Role Types
 * Types related to roles, permissions, and escalation hierarchies
 */

import type {
  RoleID,
  UID,
  FacilityID,
  Branch,
  Duration,
  StandardTimestamps,
  EscalationItem,
} from './common';

// ============================================================================
// Role Types
// ============================================================================

export type RoleType =
  | 'normal'
  | 'environmentalManagers'
  | 'generalManagers'
  | 'safetyManagers';

// ============================================================================
// Role
// ============================================================================

export interface Role extends StandardTimestamps {
  roleID: RoleID;
  facility: FacilityID;
  type: RoleType;
  branches: Branch[];
  name: string;
  owner: UID; // Single owner
  involved: UID[]; // Multiple involved users
  escalates?: Duration; // When to escalate if task not completed
  mustBeAssignedToEscalate: boolean;
}

// ============================================================================
// Facility Hierarchy Config
// ============================================================================

export interface FacilityHierarchyConfig {
  environmentalManagers?: EscalationItem;
  safetyManagers?: EscalationItem;
  generalManagers?: EscalationItem;
  corporateEnvironmentalManagers?: EscalationItem;
  [roleID: RoleID]: EscalationItem; // Custom roles
}

// ============================================================================
// Task Escalation Hierarchy
// ============================================================================

export interface User {
  uid: UID;
  email: string;
  first_name: string;
  last_name: string;
  jobTitle?: string;
  organizationalLocation?: string;
}

export interface TaskEscalationHierarchy {
  environmentalManagers?: {
    roleID?: RoleID;
    users?: User[];
    escalates?: Duration;
    mustBeAssignedToEscalate?: boolean;
  };
  safetyManagers?: {
    roleID?: RoleID;
    users?: User[];
    escalates?: Duration;
    mustBeAssignedToEscalate?: boolean;
  };
  generalManagers?: {
    roleID?: RoleID;
    users?: User[];
    escalates?: Duration;
    mustBeAssignedToEscalate?: boolean;
  };
  corporateEnvironmentalManagers?: {
    roleID?: RoleID;
    users?: User[];
    escalates?: Duration;
    mustBeAssignedToEscalate?: boolean;
  };
  [roleID: RoleID]: {
    roleID?: RoleID;
    users?: User[];
    escalates?: Duration;
    mustBeAssignedToEscalate?: boolean;
  };
}
