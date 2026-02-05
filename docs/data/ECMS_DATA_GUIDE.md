# ECMS Data Management Guide

This guide explains how to work with ECMS data in the redesign prototyping environment.

## Table of Contents

- [Overview](#overview)
- [Data Structure](#data-structure)
- [Using Seed Data](#using-seed-data)
- [Generating New Data](#generating-new-data)
- [Import/Export](#importexport)
- [Type Definitions](#type-definitions)
- [Backup and Restore](#backup-and-restore)

---

## Overview

The ECMS redesign now includes comprehensive type definitions and utilities that match the real ECMS data model. This makes it easy to prototype realistic UI/UX features with production-like data.

### What's Included

- **Type Definitions**: Complete TypeScript types matching real ECMS entities
- **Seed Data**: Pre-generated realistic mock data
- **Data Utilities**: Functions for generating additional data
- **Import/Export Tools**: Easy data management
- **Validation**: Data integrity checks

---

## Data Structure

### Core Entities

The ECMS data model includes these primary entities:

#### 1. **Facilities**

Physical locations where compliance work happens.

```typescript
{
  facilityID: "facility_bst_0001",
  facility: "Birmingham Steel",
  abbr: "BST",
  group: "Steel Mills",
  active: true,
  address: "1200 Industrial Parkway",
  city: "Birmingham",
  state: "AL",
  // ... more fields
}
```

#### 2. **Tasks** (Three-Tier System)

- **TaskTemplate**: Reusable task definition
- **TaskGenerator**: Creates tasks on a schedule
- **Task**: Individual task instance with due date

```typescript
{
  taskID: "task_00000001",
  taskTemplateID: "template_000001",
  taskGeneratorID: "generator_000001",
  facilityID: "facility_bst_0001",
  title: "Monthly Air Emissions Monitoring",
  inspectionType: "Monitoring",
  category: "Air",
  owner: "uid_00001001",
  dueAt: "2026-01-31",
  tracked: true,
  // ... more fields
}
```

#### 3. **Users**

```typescript
{
  uid: "uid_00001001",
  email: "alex.smith@nucor.com",
  first_name: "Alex",
  last_name: "Smith",
  jobTitle: "Environmental Manager",
  facilityID: "facility_bst_0001",
  branches: ["environmental"]
}
```

#### 4. **Roles**

```typescript
{
  roleID: "role_000001",
  facilityID: "facility_bst_0001",
  type: "environmentalManagers",
  branches: ["environmental"],
  name: "Environmental Managers",
  owner: "uid_00001001",
  involved: ["uid_00001001"]
}
```

#### 5. **External Tasks**

Integration points with external systems (FES, NEU, permits, etc.)

### Full Entity List

- Facilities
- Users
- Roles
- Task Templates
- Task Generators
- Tasks
- External Tasks
- Folders
- ECMS Files
- Audit Logs
- Notifications
- Daily Digests

---

## Using Seed Data

### Load Pre-Generated Data

The app includes realistic seed data in [app/data/ecmsSeedData.json](app/data/ecmsSeedData.json).

```typescript
import { useEcmsData } from '~/composables/useEcmsData';

const { loadSeedData } = useEcmsData();

// Load all seed data
const data = loadSeedData();

console.log('Facilities:', data.facilities?.length);
console.log('Tasks:', data.tasks?.length);
```

### What's Included in Seed Data

- **3 Facilities**: Birmingham Steel, Tuscaloosa Mill, Memphis Processing
- **4 Users**: Environmental and safety managers
- **2 Roles**: Environmental Managers, Safety Managers
- **2 Task Templates**: Air monitoring, stormwater inspection
- **2 Task Generators**: Monthly and quarterly schedules
- **5 Tasks**: Mix of upcoming, overdue, and completed tasks
- **2 External Tasks**: Permit renewal, training assignment
- **2 Folders**: Air and water permits

---

## Generating New Data

### Generate Additional Facilities

```typescript
import { useEcmsData } from '~/composables/useEcmsData';

const { generateAdditionalFacilities } = useEcmsData();

// Generate 5 random facilities
const facilities = generateAdditionalFacilities(5);
```

### Generate Users

```typescript
import { useEcmsData } from '~/composables/useEcmsData';

const { generateAdditionalUsers } = useEcmsData();

// Generate 10 environmental users for a specific facility
const users = generateAdditionalUsers(10, 'facility_bst_0001', [
  'environmental',
]);
```

### Generate Tasks

```typescript
import { useEcmsData } from '~/composables/useEcmsData';

const { generateAdditionalTasks } = useEcmsData();

// Generate 20 tasks for a facility
const { generator, tasks } = generateAdditionalTasks(
  'facility_bst_0001', // Facility ID
  'uid_00001001', // Owner UID
  20, // Count
  {
    branches: ['environmental'],
    includeOverdue: true,
    includeCompleted: true,
  },
);
```

### Generate Complete Facility Dataset

This creates a full set of related data for a new facility:

```typescript
import { useEcmsData } from '~/composables/useEcmsData';

const { generateFacilityDataSet } = useEcmsData();

// Generate complete dataset for a new facility
const dataset = generateFacilityDataSet(
  'Phoenix Manufacturing', // Facility name
  'PHX', // Abbreviation
);

// Returns: facilities, users, roles, taskGenerators, tasks
console.log('Generated:', dataset);
```

---

## Import/Export

### Export Data to JSON

```typescript
import { useEcmsData } from '~/composables/useEcmsData';

const { exportData } = useEcmsData();

// Export current data
const data = {
  facilities: [...],
  tasks: [...],
  // ... other entities
};

const jsonString = await exportData(data);
console.log(jsonString);
```

### Download Data as File

```typescript
import { useEcmsData } from '~/composables/useEcmsData';

const { downloadDataAsFile } = useEcmsData();

const data = loadSeedData();
downloadDataAsFile(data, 'my-ecms-data.json');
```

### Import Data from JSON

```typescript
import { useEcmsData } from '~/composables/useEcmsData';

const { importData } = useEcmsData();

const jsonString = `{
  "facilities": [...],
  "tasks": [...]
}`;

const data = importData(jsonString);
```

### Validate Data

```typescript
import { useEcmsData } from '~/composables/useEcmsData';

const { validateData } = useEcmsData();

const data = loadSeedData();
const validation = validateData(data);

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

### Get Data Statistics

```typescript
import { useEcmsData } from '~/composables/useEcmsData';

const { getDataStats } = useEcmsData();

const data = loadSeedData();
const stats = getDataStats(data);

console.log('Total facilities:', stats.facilities);
console.log('Total tasks:', stats.tasks);
console.log('Completed tasks:', stats.taskStats.completed);
console.log('Overdue tasks:', stats.taskStats.overdue);
```

---

## Type Definitions

All ECMS types are available in [app/types/ecms/](app/types/ecms/).

### Import Types

```typescript
import type {
  Facility,
  Task,
  TaskTemplate,
  TaskGenerator,
  Role,
  FacilityID,
  TaskID,
  UID,
  InspectionType,
  TaskCategory,
  Branch,
} from '~/types/ecms';
```

### Type Files

- `common.ts` - Shared types (IDs, timestamps, enums)
- `facilities.ts` - Facility and config types
- `tasks.ts` - Task, template, generator types
- `customFields.ts` - 15+ custom field types
- `roles.ts` - Role and escalation types
- `externalTasks.ts` - External system integration types
- `files.ts` - File management types
- `notifications.ts` - Notification and digest types
- `auditLog.ts` - Audit trail types

### Using Types in Components

```vue
<script setup lang="ts">
  import type { Task, FacilityID } from '~/types/ecms';

  const tasks = ref<Task[]>([]);
  const selectedFacility = ref<FacilityID>('facility_bst_0001');

  // TypeScript will enforce correct structure
  const newTask: Task = {
    taskID: 'task_00000123',
    facilityID: selectedFacility.value,
    title: 'New Task',
    // ... TypeScript ensures all required fields are present
  };
</script>
```

---

## Backup and Restore

### Automatic Backups

When the data structure is updated, automatic backups are created in `.backups/` with timestamps:

```
.backups/
  20260127_204809/
    types/
    demoSeed.ts
    budgetGraphDemo.ts
    instant.schema.ts
```

### Manual Backup

```bash
# Create a backup before making changes
cp -r app/types .backups/types-$(date +%Y%m%d_%H%M%S)
cp app/data/ecmsSeedData.json .backups/seedData-$(date +%Y%m%d_%H%M%S).json
```

### Restore from Backup

```bash
# List available backups
ls -la .backups/

# Restore types from a backup
cp -r .backups/20260127_204809/types/* app/types/

# Restore seed data
cp .backups/seedData-20260127_204809.json app/data/ecmsSeedData.json
```

---

## Advanced Usage

### Custom Field Types

The system supports 15+ specialized custom field types:

```typescript
import type { TaskCustomField } from '~/types/ecms';

// Method 9 observations field
const method9Field: TaskCustomField = {
  fieldID: 'cf_method9',
  label: 'Method 9 Opacity Observations',
  type: 'method9',
  stages: [
    {
      stageID: 'stage_1',
      name: 'Initial Reading',
      startIndex: 0,
      endIndex: 23,
    },
  ],
};

// KPI data entry field
const kpiField: TaskCustomField = {
  fieldID: 'cf_kpi',
  label: 'Monthly KPI Data',
  type: 'kpi',
};
```

### Task Scheduling

Tasks are generated from schedules:

```typescript
const schedule = {
  scheduleID: 'schedule_001',
  frequency: { months: 1 }, // Every month
  create: { days: -7 }, // Create 7 days before due
  notifyOnCreate: true,
  notifyOnDue: true,
  notifyGrouping: 'digest',
  notifications: [
    {
      scheduleNotificationID: 'notif_1',
      when: { days: -3 }, // 3 days before due
      escalationLevel: 1,
    },
  ],
  dueAtFirst: {
    date: '2026-02-01',
    timeZone: 'America/Chicago',
  },
};
```

### Escalation Hierarchy

Tasks can escalate through management levels:

```typescript
const facilityHierarchy = {
  environmentalManagers: {
    roleID: 'role_000001',
    users: ['uid_00001001'],
    escalates: { days: 3 },
    mustBeAssignedToEscalate: false,
  },
  generalManagers: {
    roleID: 'role_000002',
    users: ['uid_00001002'],
    escalates: { days: 2 },
  },
  corporateEnvironmentalManagers: {
    users: ['uid_00001003'],
  },
};
```

---

## InstantDB Schema

The ECMS entities are defined in [instant.schema.ts](instant.schema.ts).

### Schema Structure

```typescript
entities: {
  facilities: { /* facility fields */ },
  tasks: { /* task fields */ },
  taskTemplates: { /* template fields */ },
  taskGenerators: { /* generator fields */ },
  roles: { /* role fields */ },
  externalTasks: { /* external task fields */ },
  folders: { /* folder fields */ },
  ecmsFiles: { /* file fields */ },
  auditLogs: { /* audit log fields */ },
  notifications: { /* notification fields */ },
  dailyDigests: { /* digest fields */ },
}

links: {
  facilityTasks: { /* facility → tasks */ },
  taskGeneratorTasks: { /* generator → tasks */ },
  // ... more relationships
}
```

---

## Tips for Prototyping

### 1. Start with Seed Data

Load the pre-generated seed data to quickly see realistic content:

```typescript
const { loadSeedData } = useEcmsData();
const data = loadSeedData();
```

### 2. Generate More Data as Needed

If you need more variety, generate additional entities:

```typescript
// Need more facilities?
const moreFacilities = generateAdditionalFacilities(10);

// Need more tasks?
const { tasks } = generateAdditionalTasks(
  'facility_bst_0001',
  'uid_00001001',
  50,
);
```

### 3. Focus on Specific Features

Don't try to implement everything. Pick the entities you need for your prototype:

```typescript
// Prototyping task list? Just load tasks and facilities
const data = {
  facilities: loadSeedData().facilities,
  tasks: loadSeedData().tasks,
};
```

### 4. Use TypeScript

The types will help you avoid mistakes:

```typescript
import type { Task, InspectionType } from '~/types/ecms';

// TypeScript will catch errors
const task: Task = {
  // ... TypeScript ensures correct structure
};
```

### 5. Validate Your Changes

Before exporting or sharing data, validate it:

```typescript
const { validateData } = useEcmsData();
const validation = validateData(myData);

if (!validation.valid) {
  console.error('Fix these issues:', validation.errors);
}
```

---

## Questions?

This is a prototyping environment, so feel free to experiment! The backup system ensures you can always revert changes.

For adding new entity types or extending existing ones, update the relevant files in [app/types/ecms/](app/types/ecms/) and [app/lib/ecmsSeedData.ts](app/lib/ecmsSeedData.ts).
