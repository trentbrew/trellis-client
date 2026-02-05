/**
 * ECMS Data Management Composable
 * Utilities for importing, exporting, and managing ECMS data
 */

import seedData from '../data/ecmsSeedData.json';
import {
  generateFacilities,
  generateUsers,
  generateTasksForFacility,
  createRole,
  type FacilityID,
  type UID,
} from '../lib/ecmsSeedData';

export interface EcmsDataSet {
  facilities?: any[];
  users?: any[];
  roles?: any[];
  taskTemplates?: any[];
  taskGenerators?: any[];
  tasks?: any[];
  externalTasks?: any[];
  folders?: any[];
  ecmsFiles?: any[];
  auditLogs?: any[];
  notifications?: any[];
  dailyDigests?: any[];
}

export function useEcmsData() {
  /**
   * Load seed data from JSON file
   */
  function loadSeedData(): EcmsDataSet {
    return {
      facilities: seedData.facilities,
      users: seedData.users,
      roles: seedData.roles,
      taskTemplates: seedData.taskTemplates,
      taskGenerators: seedData.taskGenerators,
      tasks: seedData.tasks,
      externalTasks: seedData.externalTasks,
      folders: seedData.folders,
    };
  }

  /**
   * Generate additional facilities
   */
  function generateAdditionalFacilities(count: number = 5) {
    return generateFacilities({ count });
  }

  /**
   * Generate additional users
   */
  function generateAdditionalUsers(
    count: number = 10,
    facilityID?: FacilityID,
    branches?: ('environmental' | 'safety')[]
  ) {
    return generateUsers({ count, facilityID, branches });
  }

  /**
   * Generate tasks for a facility
   */
  function generateAdditionalTasks(
    facilityID: FacilityID,
    owner: UID,
    count: number = 10,
    options: {
      branches?: ('environmental' | 'safety')[];
      includeOverdue?: boolean;
      includeCompleted?: boolean;
    } = {}
  ) {
    return generateTasksForFacility({
      facilityID,
      owner,
      count,
      ...options,
    });
  }

  /**
   * Export current data to JSON
   */
  async function exportData(data: EcmsDataSet): Promise<string> {
    const exportData = {
      version: '1.0.0',
      generated: new Date().toISOString(),
      description: 'ECMS data export',
      ...data,
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import data from JSON string
   */
  function importData(jsonString: string): EcmsDataSet {
    try {
      const data = JSON.parse(jsonString);
      return {
        facilities: data.facilities || [],
        users: data.users || [],
        roles: data.roles || [],
        taskTemplates: data.taskTemplates || [],
        taskGenerators: data.taskGenerators || [],
        tasks: data.tasks || [],
        externalTasks: data.externalTasks || [],
        folders: data.folders || [],
        ecmsFiles: data.ecmsFiles || [],
        auditLogs: data.auditLogs || [],
        notifications: data.notifications || [],
        dailyDigests: data.dailyDigests || [],
      };
    } catch (error) {
      console.error('Failed to import data:', error);
      throw new Error('Invalid JSON format');
    }
  }

  /**
   * Download data as JSON file
   */
  function downloadDataAsFile(data: EcmsDataSet, filename: string = 'ecms-data.json') {
    exportData(data).then((jsonString) => {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  /**
   * Generate a complete dataset for a new facility
   */
  function generateFacilityDataSet(facilityName: string, abbr: string) {
    // Generate facility
    const facilities = generateFacilities({ count: 1 });
    const facility = facilities[0];
    facility.facility = facilityName;
    facility.abbr = abbr;

    // Generate users for this facility
    const users = generateUsers({ count: 5, facilityID: facility.facilityID as FacilityID });

    // Create roles
    const envManager = users.find((u) => u.branches.includes('environmental'));
    const safetyManager = users.find((u) => u.branches.includes('safety'));

    const roles = [
      createRole({
        facilityID: facility.facilityID as FacilityID,
        type: 'environmentalManagers',
        branches: ['environmental'],
        name: 'Environmental Managers',
        owner: envManager?.uid as UID,
        involved: [envManager?.uid as UID],
      }),
      createRole({
        facilityID: facility.facilityID as FacilityID,
        type: 'safetyManagers',
        branches: ['safety'],
        name: 'Safety Managers',
        owner: safetyManager?.uid as UID,
        involved: [safetyManager?.uid as UID],
      }),
    ];

    // Generate tasks
    const { generator, tasks } = generateTasksForFacility({
      facilityID: facility.facilityID as FacilityID,
      owner: envManager?.uid as UID,
      count: 10,
      branches: ['environmental'],
      includeOverdue: true,
      includeCompleted: true,
    });

    return {
      facilities: [facility],
      users,
      roles,
      taskGenerators: [generator],
      tasks,
    };
  }

  /**
   * Validate data structure
   */
  function validateData(data: EcmsDataSet): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for required fields in facilities
    if (data.facilities) {
      data.facilities.forEach((facility, index) => {
        if (!facility.facilityID) errors.push(`Facility ${index}: Missing facilityID`);
        if (!facility.facility) errors.push(`Facility ${index}: Missing facility name`);
        if (!facility.abbr) errors.push(`Facility ${index}: Missing abbreviation`);
      });
    }

    // Check for required fields in tasks
    if (data.tasks) {
      data.tasks.forEach((task, index) => {
        if (!task.taskID) errors.push(`Task ${index}: Missing taskID`);
        if (!task.facilityID) errors.push(`Task ${index}: Missing facilityID`);
        if (!task.taskGeneratorID) errors.push(`Task ${index}: Missing taskGeneratorID`);
        if (!task.owner) errors.push(`Task ${index}: Missing owner`);
        if (!task.dueAt) errors.push(`Task ${index}: Missing dueAt`);
      });
    }

    // Check for orphaned tasks (task references non-existent facility)
    if (data.tasks && data.facilities) {
      const facilityIDs = new Set(data.facilities.map((f) => f.facilityID));
      data.tasks.forEach((task, index) => {
        if (!facilityIDs.has(task.facilityID)) {
          errors.push(`Task ${index}: References non-existent facilityID ${task.facilityID}`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get statistics about the dataset
   */
  function getDataStats(data: EcmsDataSet) {
    const stats = {
      facilities: data.facilities?.length || 0,
      users: data.users?.length || 0,
      roles: data.roles?.length || 0,
      taskTemplates: data.taskTemplates?.length || 0,
      taskGenerators: data.taskGenerators?.length || 0,
      tasks: data.tasks?.length || 0,
      externalTasks: data.externalTasks?.length || 0,
      folders: data.folders?.length || 0,
      ecmsFiles: data.ecmsFiles?.length || 0,
      auditLogs: data.auditLogs?.length || 0,
      notifications: data.notifications?.length || 0,
      dailyDigests: data.dailyDigests?.length || 0,
    };

    // Task statistics
    const taskStats = {
      total: stats.tasks,
      completed: data.tasks?.filter((t) => t.completedAt).length || 0,
      overdue: data.tasks?.filter((t) => t.overdue).length || 0,
      tracked: data.tasks?.filter((t) => t.tracked === true).length || 0,
    };

    return { ...stats, taskStats };
  }

  return {
    // Data loading
    loadSeedData,

    // Data generation
    generateAdditionalFacilities,
    generateAdditionalUsers,
    generateAdditionalTasks,
    generateFacilityDataSet,

    // Import/Export
    exportData,
    importData,
    downloadDataAsFile,

    // Validation
    validateData,
    getDataStats,
  };
}
