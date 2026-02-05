# ECMS Data Quick Reference

Quick copy-paste examples for common operations.

## Load Seed Data

```typescript
import { useEcmsData } from '~/composables/useEcmsData';

const { loadSeedData } = useEcmsData();
const data = loadSeedData();
```

## Generate a New Facility with Full Dataset

```typescript
import { useEcmsData } from '~/composables/useEcmsData';

const { generateFacilityDataSet } = useEcmsData();

const dataset = generateFacilityDataSet('Phoenix Manufacturing', 'PHX');
// Returns: { facilities, users, roles, taskGenerators, tasks }
```

## Generate More Tasks

```typescript
import { useEcmsData } from '~/composables/useEcmsData';

const { generateAdditionalTasks } = useEcmsData();

const { generator, tasks } = generateAdditionalTasks(
  'facility_bst_0001',
  'uid_00001001',
  20,
  {
    branches: ['environmental'],
    includeOverdue: true,
    includeCompleted: true,
  },
);
```

## Import Types

```typescript
import type {
  // Core entities
  Facility,
  Task,
  TaskTemplate,
  TaskGenerator,
  Role,

  // ID types
  FacilityID,
  TaskID,
  UID,

  // Enums
  InspectionType,
  TaskCategory,
  Branch,
  TrackedStatus,

  // External tasks
  ExternalTask,
  PermitRenewalExternalTask,
  NeuAssignmentExternalTask,

  // Custom fields
  TaskCustomField,
  TaskCustomFieldMethod9,
  TaskCustomFieldKpi,
} from '~/types/ecms';
```

## Create Custom Entities

```typescript
import {
  generateUID,
  generateFacilityID,
  generateTaskID,
  createUser,
  createFacility,
  createTask,
  getDaysFromNow,
} from '~/lib/ecmsSeedData';

// Create a user
const user = createUser({
  firstName: 'Alex',
  lastName: 'Smith',
  jobTitle: 'Environmental Manager',
  branches: ['environmental'],
});

// Create a facility
const facility = createFacility({
  name: 'Phoenix Manufacturing',
  abbr: 'PHX',
  city: 'Phoenix',
  state: 'AZ',
});

// Create a task
const task = createTask({
  taskGeneratorID: 'generator_000001',
  facilityID: 'facility_bst_0001',
  title: 'Monthly Air Emissions Monitoring',
  inspectionType: 'Monitoring',
  category: 'Air',
  owner: 'uid_00001001',
  dueAt: getDaysFromNow(30), // Due in 30 days
  tracked: true,
});
```

## Validation

```typescript
import { useEcmsData } from '~/composables/useEcmsData';

const { validateData, getDataStats } = useEcmsData();

const data = loadSeedData();

// Validate
const validation = validateData(data);
if (!validation.valid) {
  console.error('Errors:', validation.errors);
}

// Get stats
const stats = getDataStats(data);
console.log('Tasks:', stats.tasks);
console.log('Completed:', stats.taskStats.completed);
console.log('Overdue:', stats.taskStats.overdue);
```

## Export/Download

```typescript
import { useEcmsData } from '~/composables/useEcmsData';

const { downloadDataAsFile } = useEcmsData();

const data = loadSeedData();
downloadDataAsFile(data, 'my-ecms-backup.json');
```

## Task Categories & Inspection Types

### Environmental Branches

```typescript
// Inspection Types
'Calibration';
'Fee';
'Inspection';
'Monitoring';
'New Permit';
'Notification';
'Permit Renewal';
'Plan';
'Registration';
'Report';
'Testing';
'Training';
'Update/Review';

// Categories
'Air';
'Water';
'Waste';
'SPCC';
'EPCRA';
'DOT';
'EMS';
```

### Safety Branches

```typescript
// Inspection Types
'Audit';
'Emergency Drill';
'Equipment Inspection';
'Hazard Assessment';
'Incident Investigation';
'Job Safety Analysis';
'Medical Surveillance';
'Risk Assessment';
'Safety Meeting';
'Safety Training';
'Self-Inspection';
'Third-Party Inspection';
'Workplace Inspection';

// Categories
'Chemical Safety';
'Electrical Safety';
'Emergency Preparedness';
'Fire Safety';
'Fall Protection';
'PPE';
'Lockout/Tagout';
```

## Common Patterns

### Filter Tasks by Status

```typescript
const tasks = loadSeedData().tasks;

const overdue = tasks.filter((t) => t.overdue);
const completed = tasks.filter((t) => t.completedAt);
const upcoming = tasks.filter((t) => !t.overdue && !t.completedAt);
const tracked = tasks.filter((t) => t.tracked === true);
```

### Group Tasks by Category

```typescript
const tasks = loadSeedData().tasks;

const byCategory = tasks.reduce(
  (acc, task) => {
    if (!acc[task.category]) acc[task.category] = [];
    acc[task.category].push(task);
    return acc;
  },
  {} as Record<string, typeof tasks>,
);
```

### Get Tasks for a Facility

```typescript
const tasks = loadSeedData().tasks;
const facilityID = 'facility_bst_0001';

const facilityTasks = tasks.filter((t) => t.facilityID === facilityID);
```

### Find User by Email

```typescript
const users = loadSeedData().users;
const email = 'alex.smith@nucor.com';

const user = users.find((u) => u.email === email);
```
