# Entity System

> Two-axis entity class/type architecture, registry, and composables.

## Overview

<!-- manual:start -->
*Write your content here. This section is preserved across regenerations.*
<!-- manual:end -->

## Entity Classes

**File**: `apps/web/app/types/entity.ts` — 1156 lines

**Exports**:
- `type EntityClass`
- `type TemporalEntityType`
- `type DocumentEntityType`
- `type ActorEntityType`
- `type ContainerEntityType`
- `type EntityType`
- `interface EntityBase`
- `interface TemporalMixin`
- `interface DocumentMixin`
- `interface ActorMixin`
- `interface ContainerMixin`
- `type Priority`
- `type Urgency`
- `type ContainerStatus`
- `type TaskStatus`
- `type EventSubtype`
- `type TripStatus`
- `type PaymentStatus`
- `type TransportMode`
- `type SprintStatus`
- `type BudgetStatus`
- `interface Reminder`
- `interface RecurrenceRule`
- `type FileType`
- `interface FileReference`
- `interface EntityReference`
- `interface BookmarkReference`
- `type Reference`
- `const isFileReference`
- `const isEntityReference`
- `const isBookmarkReference`
- `interface Attachment`
- `interface ChecklistItem`
- `interface Attendee`
- `interface FormulaField`
- `interface SocialLink`
- `type ProjectStatus`
- `type EventType`
- `const DEFAULT_CATEGORIES`
- `type DefaultCategory`
- `interface EntityItemBase`
- `interface TaskItem`
- `interface EventItem`
- `interface TripItem`
- `type PaymentChannel`
- `type PaymentDirection`
- `interface TransactionCounterparty`
- `interface PaymentLineItem`
- `interface PaymentItem`
- `interface AppointmentItem`
- `interface ReminderItem`
- `interface DeadlineItem`
- `interface MilestoneItem`
- `interface SprintItem`
- `interface BudgetItem`
- `interface NoteItem`
- `interface FileItem`
- `interface PageItem`
- `interface TemplateItem`
- `interface SlideDeckItem`
- `interface BookmarkItem`
- `interface PersonItem`
- `interface ContactItem`
- `interface OrganizationItem`
- `interface VendorItem`
- `interface ProjectItem`
- `interface FolderItem`
- `interface CollectionItem`
- `interface GoalItem`
- `type TemporalEntity`
- `type DocumentEntity`
- `type ActorEntity`
- `type ContainerEntity`
- `type Entity`
- `type EntityOfClass`
- `const getEntityClass`
- `const isTemporal`
- `const isDocument`
- `const isActor`
- `const isContainer`
- `const isTask`
- `const isEvent`
- `const isTrip`
- `const isPayment`
- `const isAppointment`
- `const isNote`
- `const isFile`
- `const isSlideDeck`
- `const isBookmark`
- `const isPerson`
- `const isOrganization`
- `const isProject`
- `const isFolder`
- `const isGoal`
- `const isSprint`
- `const isMilestone`
- `const isBudget`
- `const createDefaultBase`
- `const createDefaultTask`
- `const createDefaultEvent`
- `const createDefaultTrip`
- `const createDefaultPayment`
- `const createDefaultNote`
- `const createDefaultSlideDeck`
- `const createDefaultBookmark`
- `const createDefaultPerson`
- `const createDefaultOrganization`
- `const createDefaultFile`
- `const createDefaultSprint`
- `const createDefaultMilestone`
- `const createDefaultGoal`
- `const createDefaultBudget`
- `const createDefaultProject`
- `const createDefaultItem`
- `const ENTITY_TYPE_OPTIONS`
- `const PRIORITY_OPTIONS`
- `const URGENCY_OPTIONS`
- `const TASK_STATUS_OPTIONS`
- `const EVENT_TYPE_OPTIONS`
- `const TRIP_STATUS_OPTIONS`
- `const TRANSPORT_OPTIONS`
- `const PAYMENT_STATUS_OPTIONS`
- `const SPRINT_STATUS_OPTIONS`
- `const BUDGET_STATUS_OPTIONS`
- `const CURRENCY_OPTIONS`
- `const CATEGORY_OPTIONS`
- `type CalendarItemBase`
- `type CalendarItem`
- `type CalendarItemType`
- `const CALENDAR_ITEM_TYPES`
- `type PropertyFieldId`
- `type PropertyFieldGroup`
- `type PropertyFieldDisplay`
- `interface PropertyFieldConfig`
- `interface EntityPanelConfig`
- `interface EntityTypeConfig`
- `interface EntityClassConfig`


## Entity Registry

**File**: `apps/web/app/config/entityRegistry.ts` — 1113 lines

**Exports**:
- `const ENTITY_CLASSES`
- `function getPropertyFieldsForType`
- `function typeHasField`
- `function getFieldsByGroup`
- `function getEntityTypeConfig`
- `function getEntityClassConfig`
- `function getEntityClassForType`
- `function getTypesForClass`
- `function getProjectionsForType`
- `function getDefaultProjectionForType`
- `function getPanelsForType`
- `function getDialogShellForType`
- `function getAllEntityTypes`
- `function getAllEntityTypeIds`
- `interface EntityTypeOption`
- `function buildEntityTypeOptions`
- `function buildGroupedEntityTypeOptions`


## Recent Changes

| File | +Added | -Removed | Timestamp |
|------|--------|----------|-----------|
| `apps/web/app/types/calendarItem.ts` | +3 | -0 | 2026-02-07T22:45:01.178377-08:00 |
| `apps/web/app/types/entity.ts` | +2 | -0 | 2026-02-09T15:14:34.532851-08:00 |
| `apps/web/app/config/entityRegistry.ts` | +6 | -0 | 2026-02-09T15:15:48.450741-08:00 |
| `apps/web/app/types/calendarItem.ts` | +21 | -0 | 2026-02-09T15:43:43.436441-08:00 |
| `apps/web/app/types/entity.ts` | +0 | -0 | 2026-02-09T15:43:50.515334-08:00 |
| `apps/web/app/config/entityRegistry.ts` | +20 | -0 | 2026-02-09T15:43:58.514843-08:00 |
| `apps/web/app/types/entity.ts` | +10 | -0 | 2026-02-10T10:53:50.133797-08:00 |
| `apps/web/app/types/calendarItem.ts` | +25 | -0 | 2026-02-10T10:54:07.784027-08:00 |
| `apps/web/app/config/entityRegistry.ts` | +20 | -0 | 2026-02-10T10:54:17.948896-08:00 |
| `apps/web/app/config/entityRegistry.ts` | +0 | -0 | 2026-02-10T12:15:59.777785-08:00 |
| `apps/web/app/config/entityRegistry.ts` | +0 | -0 | 2026-02-10T12:58:24.605353-08:00 |
| `apps/web/app/types/calendarItem.ts` | +2 | -0 | 2026-02-10T14:26:38.42564-08:00 |
| `apps/web/app/types/calendarItem.ts` | +46 | -0 | 2026-02-10T14:37:19.454767-08:00 |
| `apps/web/app/types/calendarItem.ts` | +23 | -0 | 2026-02-10T16:58:45.965622-08:00 |
| `apps/web/app/config/entityRegistry.ts` | +9 | -0 | 2026-02-11T16:25:31.042033-08:00 |
| `apps/web/app/types/entity.ts` | +9 | -0 | 2026-02-11T19:27:15.489582-08:00 |
| `apps/web/app/types/calendarItem.ts` | +0 | -0 | 2026-02-11T19:27:27.845705-08:00 |
| `apps/web/app/types/calendarItem.ts` | +13 | -0 | 2026-02-12T10:08:35.005614-08:00 |
| `apps/web/app/types/calendarItem.ts` | +0 | -0 | 2026-02-12T10:52:49.35686-08:00 |
| `apps/web/app/types/entity.ts` | +24 | -0 | 2026-02-12T15:14:10.816432-08:00 |

---
*Auto-generated by [TQL Living Docs](../.tql/docs.trellis.jsonld) at 2026-02-14T02:21:35.727Z*
