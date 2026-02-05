/**
 * ECMS Seed Data Utilities
 * Factory functions and utilities for generating realistic ECMS mock data
 */

import type {
  FacilityID,
  UID,
  TaskID,
  TaskTemplateID,
  TaskGeneratorID,
  RoleID,
  FileID,
  FolderID,
  Timestamp,
  ISO8601DateOnly,
  InspectionType,
  TaskCategory,
  Branch,
  TrackedStatus,
} from '../types/ecms';

// ============================================================================
// ID Generators
// ============================================================================

let uidCounter = 1000;
let facilityCounter = 1;
let taskCounter = 1;
let templateCounter = 1;
let generatorCounter = 1;
let roleCounter = 1;
let fileCounter = 1;
let folderCounter = 1;

export function generateUID(): UID {
  return `uid_${String(uidCounter++).padStart(8, '0')}`;
}

export function generateFacilityID(abbr: string): FacilityID {
  return `facility_${abbr.toLowerCase()}_${String(facilityCounter++).padStart(4, '0')}`;
}

export function generateTaskID(): TaskID {
  return `task_${String(taskCounter++).padStart(8, '0')}`;
}

export function generateTaskTemplateID(): TaskTemplateID {
  return `template_${String(templateCounter++).padStart(6, '0')}`;
}

export function generateTaskGeneratorID(): TaskGeneratorID {
  return `generator_${String(generatorCounter++).padStart(6, '0')}`;
}

export function generateRoleID(): RoleID {
  return `role_${String(roleCounter++).padStart(6, '0')}`;
}

export function generateFileID(): FileID {
  return `file_${String(fileCounter++).padStart(8, '0')}`;
}

export function generateFolderID(): FolderID {
  return `folder_${String(folderCounter++).padStart(6, '0')}`;
}

// ============================================================================
// Date Utilities
// ============================================================================

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function toISO8601DateOnly(date: Date): ISO8601DateOnly {
  return (date.toISOString().split('T')[0] ?? '1970-01-01') as ISO8601DateOnly;
}

export function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

export function getDaysFromNow(days: number): ISO8601DateOnly {
  return toISO8601DateOnly(addDays(new Date(), days));
}

// ============================================================================
// Sample Data Lists
// ============================================================================

export const SAMPLE_FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey',
  'Jamie', 'Riley', 'Avery', 'Quinn', 'Skylar',
  'Sam', 'Drew', 'Sage', 'River', 'Charlie',
];

export const SAMPLE_LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones',
  'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
];

export const SAMPLE_FACILITY_NAMES = [
  { name: 'Birmingham Steel', abbr: 'BST', city: 'Birmingham', state: 'AL' },
  { name: 'Tuscaloosa Mill', abbr: 'TML', city: 'Tuscaloosa', state: 'AL' },
  { name: 'Memphis Processing', abbr: 'MPR', city: 'Memphis', state: 'TN' },
  { name: 'Jackson Distribution', abbr: 'JDS', city: 'Jackson', state: 'MS' },
  { name: 'Atlanta Logistics', abbr: 'ATL', city: 'Atlanta', state: 'GA' },
];

export const ENVIRONMENTAL_INSPECTION_TYPES: InspectionType[] = [
  'Calibration',
  'Fee',
  'Inspection',
  'Monitoring',
  'New Permit',
  'Notification',
  'Permit Renewal',
  'Plan',
  'Registration',
  'Report',
  'Testing',
  'Training',
  'Update/Review',
];

export const SAFETY_INSPECTION_TYPES: InspectionType[] = [
  'Audit',
  'Emergency Drill',
  'Equipment Inspection',
  'Hazard Assessment',
  'Incident Investigation',
  'Job Safety Analysis',
  'Medical Surveillance',
  'Risk Assessment',
  'Safety Meeting',
  'Safety Training',
  'Self-Inspection',
  'Third-Party Inspection',
  'Workplace Inspection',
];

export const ENVIRONMENTAL_CATEGORIES: TaskCategory[] = [
  'Air',
  'Water',
  'Waste',
  'SPCC',
  'EPCRA',
  'DOT',
  'EMS',
];

export const SAFETY_CATEGORIES: TaskCategory[] = [
  'Chemical Safety',
  'Electrical Safety',
  'Emergency Preparedness',
  'Fire Safety',
  'Fall Protection',
  'PPE',
  'Lockout/Tagout',
];

export const SAMPLE_TASK_TITLES = {
  environmental: [
    'Monthly Air Emissions Monitoring',
    'Quarterly Stormwater Inspection',
    'Annual Hazardous Waste Report',
    'Weekly SPCC Inspection',
    'Biannual Stack Testing',
    'Monthly Wastewater Sampling',
    'Annual Title V Compliance Report',
    'Quarterly EPCRA Tier II Update',
  ],
  safety: [
    'Monthly Fire Extinguisher Inspection',
    'Quarterly Emergency Drill',
    'Annual Lockout/Tagout Audit',
    'Weekly Eyewash Station Check',
    'Monthly PPE Inspection',
    'Quarterly Safety Committee Meeting',
    'Annual Respirator Fit Testing',
    'Weekly Forklift Inspection',
  ],
};

// ============================================================================
// Factory Functions
// ============================================================================

export interface CreateUserOptions {
  uid?: UID;
  facilityID?: FacilityID;
  branches?: Branch[];
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
}

export function createUser(options: CreateUserOptions = {}) {
  const uid = options.uid || generateUID();
  const firstName =
    options.firstName ||
    SAMPLE_FIRST_NAMES[Math.floor(Math.random() * SAMPLE_FIRST_NAMES.length)] ||
    SAMPLE_FIRST_NAMES[0] ||
    'Alex';
  const lastName =
    options.lastName ||
    SAMPLE_LAST_NAMES[Math.floor(Math.random() * SAMPLE_LAST_NAMES.length)] ||
    SAMPLE_LAST_NAMES[0] ||
    'Smith';
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@platform-sandbox.local`;

  return {
    uid,
    email,
    first_name: firstName,
    last_name: lastName,
    jobTitle: options.jobTitle || 'Environmental Coordinator',
    facilityID: options.facilityID,
    branches: options.branches || ['environmental'],
    organizationalLocation: '/Corporate/Environmental',
    emailAliases: [],
  };
}

export interface CreateFacilityOptions {
  name?: string;
  abbr?: string;
  city?: string;
  state?: string;
  group?: string;
  active?: boolean;
}

export function createFacility(options: CreateFacilityOptions = {}) {
  const fallbackSample = { name: 'Sample Facility', abbr: 'SMP', city: 'Sample City', state: 'ST' };
  const sample =
    SAMPLE_FACILITY_NAMES[Math.floor(Math.random() * SAMPLE_FACILITY_NAMES.length)] ||
    SAMPLE_FACILITY_NAMES[0] ||
    fallbackSample;
  const abbr = options.abbr || sample.abbr;
  const facilityID = generateFacilityID(abbr);
  const now = Date.now();

  return {
    facilityID,
    facility: options.name || sample.name,
    abbr,
    group: options.group || 'Steel Mills',
    active: options.active ?? true,
    djj: `DJJ-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
    folder: abbr,
    address: `${Math.floor(Math.random() * 9999)} Industrial Parkway`,
    city: options.city || sample.city,
    state: options.state || sample.state,
    zip: `${Math.floor(Math.random() * 90000) + 10000}`,
    country: 'USA',
    latitude: 33 + Math.random() * 5,
    longitude: -87 + Math.random() * 5,
    timeZone: 'America/Chicago',
    createdAt: now,
    createdBy: generateUID(),
    updatedAt: now,
    updatedBy: generateUID(),
  };
}

export interface CreateRoleOptions {
  facilityID: FacilityID;
  type?: 'normal' | 'environmentalManagers' | 'generalManagers' | 'safetyManagers';
  branches?: Branch[];
  name?: string;
  owner?: UID;
  involved?: UID[];
}

export function createRole(options: CreateRoleOptions) {
  const now = Date.now();
  const roleID = generateRoleID();

  return {
    roleID,
    facilityID: options.facilityID,
    type: options.type || 'normal',
    branches: options.branches || ['environmental'],
    name: options.name || 'Environmental Manager',
    owner: options.owner || generateUID(),
    involved: options.involved || [],
    mustBeAssignedToEscalate: false,
    createdAt: now,
    createdBy: generateUID(),
    updatedAt: now,
    updatedBy: generateUID(),
  };
}

export interface CreateTaskTemplateOptions {
  branches?: Branch[];
  title?: string;
  inspectionType?: InspectionType;
  category?: TaskCategory;
  tracked?: TrackedStatus;
}

export function createTaskTemplate(options: CreateTaskTemplateOptions = {}) {
  const now = Date.now();
  const taskTemplateID = generateTaskTemplateID();
  const branches = options.branches || ['environmental'];
  const isEnvironmental = branches.includes('environmental');

  const titles = isEnvironmental ? SAMPLE_TASK_TITLES.environmental : SAMPLE_TASK_TITLES.safety;
  const inspectionTypes = isEnvironmental ? ENVIRONMENTAL_INSPECTION_TYPES : SAFETY_INSPECTION_TYPES;
  const categories = isEnvironmental ? ENVIRONMENTAL_CATEGORIES : SAFETY_CATEGORIES;

  const randomTitle =
    options.title ||
    titles[Math.floor(Math.random() * titles.length)] ||
    titles[0] ||
    'Task';
  const randomInspectionType =
    options.inspectionType ||
    inspectionTypes[Math.floor(Math.random() * inspectionTypes.length)] ||
    inspectionTypes[0] ||
    ('Inspection' as InspectionType);
  const randomCategory =
    options.category ||
    categories[Math.floor(Math.random() * categories.length)] ||
    categories[0] ||
    ('Air' as TaskCategory);

  return {
    taskTemplateID,
    standardTaskIds: [],
    branches,
    title: randomTitle,
    description: 'Detailed task description goes here.',
    tracked: options.tracked ?? true,
    schedules: [],
    isFacilityScheduleChoiceAvailable: true,
    inspectionType: randomInspectionType,
    category: randomCategory,
    owner: {},
    involved: {},
    facilities: [],
    customFieldDefinitions: [],
    canGeneratorsCustomizeFields: true,
    editableBy: [],
    isStandardTaskTemplate: false,
    createdAt: now,
    createdBy: generateUID(),
    updatedAt: now,
    updatedBy: generateUID(),
  };
}

export interface CreateTaskGeneratorOptions {
  taskTemplateID?: TaskTemplateID | null;
  facilityID: FacilityID;
  title?: string;
  inspectionType?: InspectionType;
  category?: TaskCategory;
  owner?: UID;
  tracked?: TrackedStatus;
  branches?: Branch[];
}

export function createTaskGenerator(options: CreateTaskGeneratorOptions) {
  const now = Date.now();
  const taskGeneratorID = generateTaskGeneratorID();
  const branches = options.branches || ['environmental'];
  const isEnvironmental = branches.includes('environmental');

  const titles = isEnvironmental ? SAMPLE_TASK_TITLES.environmental : SAMPLE_TASK_TITLES.safety;
  const inspectionTypes = isEnvironmental ? ENVIRONMENTAL_INSPECTION_TYPES : SAFETY_INSPECTION_TYPES;
  const categories = isEnvironmental ? ENVIRONMENTAL_CATEGORIES : SAFETY_CATEGORIES;

  const randomTitle =
    options.title ||
    titles[Math.floor(Math.random() * titles.length)] ||
    titles[0] ||
    'Task Generator';
  const randomInspectionType =
    options.inspectionType ||
    inspectionTypes[Math.floor(Math.random() * inspectionTypes.length)] ||
    inspectionTypes[0] ||
    ('Inspection' as InspectionType);
  const randomCategory =
    options.category ||
    categories[Math.floor(Math.random() * categories.length)] ||
    categories[0] ||
    ('Air' as TaskCategory);

  return {
    taskGeneratorID,
    taskTemplateID: options.taskTemplateID || null,
    facilityID: options.facilityID,
    title: randomTitle,
    description: 'Task generator description',
    tracked: options.tracked ?? true,
    schedule: {
      scheduleID: `schedule_${Date.now()}`,
      frequency: { months: 1 }, // Monthly
      create: { days: -7 }, // Create 7 days before due
      notifyOnCreate: true,
      notifyOnDue: true,
      notifyGrouping: 'digest' as const,
      notifications: [],
      dueAtFirst: {
        date: getDaysFromNow(30),
        timeZone: 'America/Chicago',
      },
      createdAt: now,
      createdBy: options.owner || generateUID(),
      updatedAt: now,
      updatedBy: options.owner || generateUID(),
    },
    inspectionType: randomInspectionType,
    category: randomCategory,
    owner: options.owner || generateUID(),
    involved: [],
    parentFolderIDs: [],
    customFieldDefinitions: [],
    standardTaskIds: [],
    branches,
    dueDateAdjustments: {},
    dueDatesExcluded: [],
    externalTaskIDs: [],
    createdAt: now,
    createdBy: options.owner || generateUID(),
    updatedAt: now,
    updatedBy: options.owner || generateUID(),
  };
}

export interface CreateTaskOptions {
  taskGeneratorID: TaskGeneratorID;
  taskTemplateID?: TaskTemplateID | null;
  facilityID: FacilityID;
  title: string;
  inspectionType: InspectionType;
  category: TaskCategory;
  owner: UID;
  dueAt: ISO8601DateOnly;
  tracked?: TrackedStatus;
  completed?: boolean;
}

export function createTask(options: CreateTaskOptions) {
  const now = Date.now();
  const taskID = generateTaskID();
  const dueDate = new Date(options.dueAt);
  const today = new Date();
  const overdue = !options.completed && dueDate < today;

  return {
    taskID,
    taskTemplateID: options.taskTemplateID || null,
    taskGeneratorID: options.taskGeneratorID,
    facilityID: options.facilityID,
    title: options.title,
    description: 'Task description',
    inspectionType: options.inspectionType,
    category: options.category,
    owner: options.owner,
    involved: [],
    dueAt: options.dueAt,
    completedAt: options.completed ? now : null,
    comments: [],
    customFieldDefinitions: [],
    customFieldValues: {},
    files: [],
    tracked: options.tracked ?? true,
    overdue,
    displayNumber: taskCounter,
    createdAt: now,
    createdBy: options.owner,
    updatedAt: now,
    updatedBy: options.owner,
  };
}

// ============================================================================
// Bulk Data Generators
// ============================================================================

export interface GenerateFacilitiesOptions {
  count?: number;
  active?: boolean;
}

export function generateFacilities(options: GenerateFacilitiesOptions = {}) {
  const count = options.count || 5;
  const facilities = [];

  for (let i = 0; i < count; i++) {
    facilities.push(createFacility({ active: options.active }));
  }

  return facilities;
}

export interface GenerateUsersOptions {
  count?: number;
  facilityID?: FacilityID;
  branches?: Branch[];
}

export function generateUsers(options: GenerateUsersOptions = {}) {
  const count = options.count || 10;
  const users = [];

  for (let i = 0; i < count; i++) {
    users.push(createUser({
      facilityID: options.facilityID,
      branches: options.branches,
    }));
  }

  return users;
}

export interface GenerateTasksForFacilityOptions {
  facilityID: FacilityID;
  owner: UID;
  count?: number;
  branches?: Branch[];
  includeOverdue?: boolean;
  includeCompleted?: boolean;
}

export function generateTasksForFacility(options: GenerateTasksForFacilityOptions) {
  const count = options.count || 10;
  const tasks = [];
  const branches = options.branches || ['environmental'];
  const isEnvironmental = branches.includes('environmental');

  const titles = isEnvironmental ? SAMPLE_TASK_TITLES.environmental : SAMPLE_TASK_TITLES.safety;
  const inspectionTypes = isEnvironmental ? ENVIRONMENTAL_INSPECTION_TYPES : SAFETY_INSPECTION_TYPES;
  const categories = isEnvironmental ? ENVIRONMENTAL_CATEGORIES : SAFETY_CATEGORIES;

  // Create a generator first
  const generator = createTaskGenerator({
    facilityID: options.facilityID,
    owner: options.owner,
    branches,
  });

  for (let i = 0; i < count; i++) {
    const daysOffset = Math.floor(Math.random() * 60) - 30; // -30 to +30 days
    const dueAt = getDaysFromNow(daysOffset);
    const completed = options.includeCompleted && Math.random() > 0.5;

    const title = titles[Math.floor(Math.random() * titles.length)] || titles[0] || 'Task';
    const inspectionType =
      inspectionTypes[Math.floor(Math.random() * inspectionTypes.length)] ||
      inspectionTypes[0] ||
      ('Inspection' as InspectionType);
    const category = categories[Math.floor(Math.random() * categories.length)] || categories[0] || ('Air' as TaskCategory);

    tasks.push(createTask({
      taskGeneratorID: generator.taskGeneratorID,
      facilityID: options.facilityID,
      title,
      inspectionType,
      category,
      owner: options.owner,
      dueAt,
      completed,
      tracked: true,
    }));
  }

  return { generator, tasks };
}
