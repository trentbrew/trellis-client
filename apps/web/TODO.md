# Task Dialog & Scheduling (Core Features)

- [x] Tasks and schedule tasks should have the same dialog
- [x] Make sure suggested tasks has its own actions (mark as not applicable, already resolved, i already have this task, create task)
- [x] For task dialog include (mark as not applicable, already resolved, i already have this task)
- [x] Remove create + delete buttons from inline list view for tasks
- [x] Use TickTick flow for reminders and repeating tasks
- [x] Custom interval days (customizable down to days, week, month, year, etc)
- [x] 3-column layout: left sidebar (schedule/calendar) | main content | right sidebar (activity)
- [x] Mini calendar in left sidebar with occurrence highlighting
- [x] Accordion sections for Reminder, Repeat, Upcoming (TickTick style)
- [x] Remove 'all day' and 'end date' from date picker (simplified to due date only)
- [x] Full-height sidebar with collapsible toggle (date click to show/hide)
- [x] Include toggle for automatic/manually scheduled
- [x] Include presets for notification frequency <!-- Could add as quick-select badges in Reminder accordion -->

# General UI/UX Cleanup

- [x] General - "Facility Tasks" vs "My Tasks" distinction. Need to create a new 'My Tasks' tab
- [x] General - Remove task priority property. Removed from UI
- [x] General - Remove branch property. Remove from mock data - branches not carried to new system
- [x] General - Remove "Reports" section from nav
- [x] General - Add 'start with template' selector above header/properties section
- [ ] General - Include reminder templates
- [ ] General - Consider 'save as template' action in footer

# Task Dialog Improvements

- [x] Add Task - Name/description should look more like inputs for clarity Added subtle border on hover
- [x] Add Task - Owner should be more prominent (first/featured with avatar)
- [ ] Add Task - Description should be rich text (TipTap: https://ui-thing.behonbaker.com/blocks/tip-tap) "smartCard-inline")
- [ ] Add Task - Update reminder methods to match system (daily digest, standalone emails, escalations)
- [x] Add Task - Reminder frequency handling Handled via TickTick-style presets + custom options
- [ ] Add Task - Show escalation schedule table when Tracked options selected
- [ ] Add Task - Custom fields need more space (esp. repeating question groups) Has dedicated section, but could expand

# Templates Page

- [x] Templates - Edit button Not needed - dialog is inline editable like TickTick
- [ ] Templates - Remove Active/Draft concept (doesn't exist in system)
- [ ] Templates - Update filters to match actual template data model

# Suggested Tasks Page

- [x] Suggested - Remove "est. time" from suggested tasks (doesn't exist)
- [x] Suggested - Actions should be "Create Task", "I already have this task", "Mark as not applicable" Already implemented
- [x] Suggested - Remove comments (suggested tasks don't have comments)
- [x] Suggested - Remove refresh button
- [ ] Suggested - Add column/filters for type (Compliance Issue, Deficient Task, etc.)
- [x] Suggested - Remove "List" view option from page configuration

# Scheduled Tasks Page

- [ ] Scheduled - Remove "paused schedule" concept (doesn't exist)
- [x] Scheduled - Remove layout toggles, stick with table view only

# All Tasks Page

- [x] All Tasks - Rename "on track" to "due later" (matches Kanban Later column)
- [x] All Tasks - Calendar view should use same modal as table view
- [ ] All Tasks - Calendar: one item per cell with task count, popup list on click
- [x] All Tasks - Remove List and Card view options (table only)

# Folders Page

- [ ] Folders - Remove sort button (or move to Explorer/Occurrences panels)

# Deferred (Post-Task Updates)

- [ ] Facility Setup - Roles: placeholder content, no people list or edit UI Circle back after task updates
- [ ] Permit Applications - Currently showing permit indexing, not applications Circle back after task updates
