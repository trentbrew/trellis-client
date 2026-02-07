# Current Problems

1. **Properties row is one-size-fits-all** — `CalendarItemDialog.vue` renders the same temporal props (`startDate`, `endDate`, `allDay`, `timeRange`, `priority`, `urgency`) for every entity type, including notes. This is the root cause of the screenshot issue.

2. **Tags** — Lives as a content section (`divide-y`) below the `EntityContentPanel`. Should be inline, right below the properties row.

3. **Pin** — Rendered as its own `divide-y` section in `NoteContent.vue`. Should be a pill toggle in the properties row.

---

# Proposed Property Matrix

I'd like to define a `propertyFields` array per entity type in the registry. Here's what I think makes sense for each type:

## Temporal Entities

| Field       | task | event | trip | payment | appointment | reminder | deadline | milestone |
| ----------- | ---- | ----- | ---- | ------- | ----------- | -------- | -------- | --------- |
| type        | ✅   | ✅    | ✅   | ✅      | ✅          | ✅       | ✅       | ✅        |
| startDate   | ✅   | ✅    | ✅   | ✅      | ✅          | ✅       | ✅       | ✅        |
| endDate     | ✅   | ✅    | ✅   | —       | ✅          | —        | —        | —         |
| allDay      | ✅   | ✅    | ✅   | ✅      | —           | —        | ✅       | ✅        |
| timeRange   | ✅   | ✅    | —    | —       | ✅          | ✅       | —        | —         |
| priority    | ✅   | —     | —    | ✅      | —           | —        | ✅       | —         |
| urgency     | ✅   | —     | —    | ✅      | —           | —        | ✅       | —         |
| category    | ✅   | ✅    | ✅   | ✅      | ✅          | ✅       | ✅       | ✅        |
| owner       | ✅   | ✅    | ✅   | ✅      | ✅          | ✅       | ✅       | ✅        |
| involved    | ✅   | ✅    | ✅   | —       | —           | —        | —        | —         |
| folder      | ✅   | —     | —    | —       | —           | —        | —        | —         |

## Document Entities

| Field    | note | file | page | template |
| -------- | ---- | ---- | ---- | -------- |
| type     | ✅   | ✅   | ✅   | ✅       |
| pin      | ✅   | ✅   | ✅   | —        |
| category | ✅   | ✅   | ✅   | ✅       |
| owner    | ✅   | ✅   | ✅   | ✅       |
| involved | ✅   | ✅   | ✅   | —        |

> No dates, no priority/urgency, no time fields.

## Actor Entities

| Field    | person | contact | organization | vendor |
| -------- | ------ | ------- | ------------ | ------ |
| type     | ✅     | ✅      | ✅           | ✅     |
| category | ✅     | ✅      | ✅           | ✅     |
| owner    | ✅     | ✅      | ✅           | ✅     |

## Container Entities

| Field     | project | folder | collection | goal       |
| --------- | ------- | ------ | ---------- | ---------- |
| type      | ✅      | ✅     | ✅         | ✅         |
| status    | ✅      | —      | —          | ✅         |
| startDate | ✅      | —      | —          | —          |
| endDate   | ✅      | —      | —          | ✅ (target) |
| category  | ✅      | ✅     | ✅         | ✅         |
| owner     | ✅      | ✅     | ✅         | ✅         |
| involved  | ✅      | —      | —          | ✅         |
