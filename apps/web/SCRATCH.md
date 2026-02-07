# Current Problems

1. **Properties row is one-size-fits-all** — `CalendarItemDialog.vue` renders the same temporal props (`startDate`, `endDate`, `allDay`, `timeRange`, `priority`, `urgency`) for every entity type, including notes. This is the root cause of the screenshot issue.

2. **Tags** — Lives as a content section (`divide-y`) below the `EntityContentPanel`. Should be inline, right below the properties row.

3. **Pin** — Rendered as its own `divide-y` section in `NoteContent.vue`. Should be a pill toggle in the properties row.

---

# Proposed Property Matrix

Define a `propertyFields` array per entity type in the registry.

## Temporal Entities

```json
{
  "task": ["type", "startDate", "endDate", "allDay", "timeRange", "priority", "urgency", "category", "owner", "involved", "folder"],
  "event": ["type", "startDate", "endDate", "allDay", "timeRange", "category", "owner", "involved"],
  "trip": ["type", "startDate", "endDate", "allDay", "category", "owner", "involved"],
  "payment": ["type", "startDate", "allDay", "priority", "urgency", "category", "owner"],
  "appointment": ["type", "startDate", "endDate", "timeRange", "category", "owner"],
  "reminder": ["type", "startDate", "timeRange", "category", "owner"],
  "deadline": ["type", "startDate", "allDay", "priority", "urgency", "category", "owner"],
  "milestone": ["type", "startDate", "allDay", "category", "owner"]
}
```

## Document Entities

```json
{
  "note": ["type", "pin", "category", "owner", "involved"],
  "file": ["type", "pin", "category", "owner", "involved"],
  "page": ["type", "pin", "category", "owner", "involved"],
  "template": ["type", "category", "owner"]
}
```

## Actor Entities

```json
{
  "person": ["type", "category", "owner"],
  "contact": ["type", "category", "owner"],
  "organization": ["type", "category", "owner"],
  "vendor": ["type", "category", "owner"]
}
```

## Container Entities

```json
{
  "project": ["type", "status", "startDate", "endDate", "category", "owner", "involved"],
  "folder": ["type", "category", "owner"],
  "collection": ["type", "category", "owner"],
  "goal": ["type", "status", "endDate", "category", "owner", "involved"]
}
```

## Field Definitions

```json
{
  "type": { "component": "select", "required": true },
  "startDate": { "component": "datePicker", "required": false },
  "endDate": { "component": "datePicker", "required": false },
  "allDay": { "component": "toggle", "default": false },
  "timeRange": { "component": "timeRangePicker", "required": false },
  "priority": { "component": "select", "options": ["low", "medium", "high"] },
  "urgency": { "component": "select", "options": ["low", "medium", "high"] },
  "category": { "component": "select", "required": false },
  "owner": { "component": "userPicker", "required": false },
  "involved": { "component": "userMultiPicker", "required": false },
  "folder": { "component": "folderPicker", "required": false },
  "pin": { "component": "pillToggle", "default": false },
  "status": { "component": "select", "options": ["active", "completed", "archived"] }
}
```
