# Permit Indexing Redesign Documentation

> **Status**: Pre-implementation research & planning
> **Target Location**: `ui/apps/v2`
> **Source Reference**: `permit-applicability-tool`

---

## 1. Current Implementation Analysis

### 1.1 Architecture Overview

The existing permit-applicability-tool is a **Firebase-based web application** with:

- **Frontend**: jQuery (legacy) + Vue 3 (gradual migration) + Bootstrap 3
- **Backend**: Firebase Auth, Functions, Cloud Firestore
- **PDF Handling**: Currently uses Adobe DC Embed API (team plans to migrate to **PDF.js**)

### 1.2 Core Workflow

The tool follows a **questionnaire-driven applicability determination** process:

```
1. Admin configures questionnaire → defines which facilities must complete it
2. Facilities answer questionnaire annually
3. Results show applicable laws/obligations + compliance issues
```

#### Key User Journeys

| Role              | Primary Actions                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------ |
| **Facility User** | Navigate programs → Select standards → Answer branching questions → Complete determination |
| **Admin**         | Configure questionnaires, manage facilities, view compliance dashboards                    |
| **Reviewer**      | Review file uploads, approve/reject permit documents                                       |

### 1.3 Data Model (Key Entities)

```typescript
// Core documents from common/types/ApplicabilityTool.d.ts

PermitDocument // Progress tracking, questionnaire reference
ResponseStatusDocument // Per-standard completion status, applicability result
ResponseDocument // Individual question responses
StandardDocument // Standard definitions, dependencies, program grouping
QuestionDocument // Question prompts, types, guidance
AnswerDocument // Answer options with branching logic
TaskDocument // ECMS tasks triggered by responses
```

### 1.4 Current UI Analysis (from Screenshots)

#### Dashboard View (Screenshot 1)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  NUCOR   [Permit Indexing]  [Review Conditional Conditions]                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Status Dist │ │ Condition   │ │ Total: 557  │ │ Pending:552 │           │
│  │  [Donut]    │ │ Types [Pie] │ │ Found:94562 │ │ Tasks:84651 │           │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                                             │
│  Permits to Index (552)                    [Select existing file] [Upload] │
│  ┌────────────┬──────────────────────┬──────────┬─────────┬───────┬───────┐│
│  │ Facility   │ Permit               │ Category │ Expires │ Prog  │Action ││
│  ├────────────┼──────────────────────┼──────────┼─────────┼───────┼───────┤│
│  │ Advantage  │ 0820-0001-DM (QAL...)│ Air Qual │ Never   │ 0/38  │ View  ││
│  │ American   │ Air Permit 2023.pdf  │ Air Qual │ 4/12/27 │ 0/70  │ View  ││
│  └────────────┴──────────────────────┴──────────┴─────────┴───────┴───────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key elements**:

- Status Distribution: Donut chart (Completed, Skipped, In Progress, Not Started)
- Condition Types: 12 categories (Inspection, Report, Other, Notification, Monitoring, etc.)
- Metrics cards: Total Permits, Conditions Found, Pending Indexing, Tasks To Be Scheduled
- Filterable table with progress indicators

#### Permit Applications View (Screenshot 2)

- Current Permit Applications (filterable table)
- Past Permit Applications
- Latest Updates from Tasks
- All showing "None" — empty state pattern

#### Condition Indexing View (Screenshots 3-4)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Permit Indexing] [Review Conditional Conditions] [View Permit: 0820...]   │
├───────────────────────────────────┬─────────────────────────────────────────┤
│  ▼ Condition #1                   │                                         │
│    Page #3 · Reference 1          │   ┌─────────────────────────────────┐   │
│    Type: Other                    │   │                                 │   │
│    Quote: "The owner or operator  │   │    ADOBE PDF EMBED              │   │
│    shall continue to operate..."  │   │                                 │   │
│    Task Description: Continue...  │   │    Nucor Corporation            │   │
│    Valuable as audit item: No     │   │    0820-0001-DM                 │   │
│    Limits: —                      │   │    Page 3 of 9                  │   │
│    Affiliation                    │   │                                 │   │
│    Specific Unit(s):              │   │    [Equipment tables]           │   │
│      • Debur-1 (Abrasive...)      │   │    [Control devices]            │   │
│      • Debur-2 (Abrasive...)      │   │    [Limitations section]        │   │
│      • CD-Mob-1, CD-Mob-2         │   │                                 │   │
│    Task Associations: ☑ Needed    │   │                                 │   │
│                                   │   └─────────────────────────────────┘   │
│  ▶ Condition #2                   │                                         │
│  ▶ Condition #3                   │                                         │
│  ▶ Condition #4                   │                                         │
└───────────────────────────────────┴─────────────────────────────────────────┘
```

**Condition card fields**:

- Page # & Reference number
- Type (Other, Monitoring, etc.)
- Quote (permit text)
- Task Description
- Valuable as audit item (Yes/No)
- Limits
- Affiliation
- Specific Unit(s) — list of equipment
- Task Associations (checkbox)

### 1.5 Pain Points Identified

1. **PDF Viewing**
   - Adobe DC Embed is being deprecated
   - No overlay/annotation capability on permit documents
   - PDF viewing disconnected from indexing workflow

2. **Question Navigation**
   - Single question visible at a time
   - Back/forward navigation can be confusing
   - No overview of question progress within a standard

3. **Multi-user Collaboration**
   - Basic "users viewing" indicator
   - Blocking edits when someone else is viewing
   - No real-time collaboration

4. **Visual Design**
   - Bootstrap 3 styling (dated)
   - Dense information display
   - Mobile experience is poor

---

## 2. User Feedback & Team Notes

### 2.1 Direct Feedback

> "An **overlay on top of the PDF** would be more user-friendly"

This suggests users want to:

- View permit documents while answering questions
- Highlight/annotate specific sections
- Reference permit conditions directly

### 2.2 Technical Direction

- **Moving away from Adobe** → PDF.js integration
- Focus on **UI/UX iteration**, not backend/data-model changes
- Final destination is **Vue 3 + Vite** (platform repo)

---

## 3. V2 Current State

### 3.1 Existing Pages in v2

| Page                  | Location                                             | Status                  |
| --------------------- | ---------------------------------------------------- | ----------------------- |
| Permit Indexing       | `/pages/[org]/[year]/[facility]/permit-indexing.vue` | Scaffold with mock data |
| Permit Indexing (alt) | `/pages/permits/indexing.vue`                        | List view scaffold      |
| File Review           | `/pages/permits/file-review.vue`                     | List view scaffold      |
| Permit Applications   | `/pages/permits/applications.vue`                    | Scaffold                |
| Permit Conditions     | `/pages/permits/conditions.vue`                      | Scaffold                |

### 3.2 V2 Architecture Highlights

- **Nuxt 3** with TypeScript
- **UI Components**: shadcn/ui + Tailwind CSS + Lucide icons
- **Layout System**: `PageSplit` component for split-panel views
- **Design Tokens**: Modern dark/light theme support

---

## 4. Redesign Opportunities

### 4.1 Current vs. Proposed Layout

**Current** (Screenshots 3-4): Fixed split panel — conditions list on left, PDF on right

- Left panel is ~40% width, scrollable list of condition accordions
- Right panel shows Adobe PDF embed
- No visual link between condition and PDF location
- User must manually scroll PDF to find referenced section

**Proposed**: User-friendly **overlay system** on PDF

- PDF takes primary focus (larger viewport)
- Conditions appear as **floating overlays** or **inline annotations** on the PDF
- Click condition → auto-scroll to relevant page/section
- Bidirectional highlighting

### 4.2 PDF Overlay System

**Concept**: Overlay-first view where users can:

```
┌─────────────────────────────────────────────────────────┐
│  ┌─────────────────────┐  ┌─────────────────────────┐  │
│  │                     │  │  Question Panel         │  │
│  │   PDF Viewer        │  │  ─────────────────────  │  │
│  │   (PDF.js)          │  │  Q: Does your facility  │  │
│  │                     │  │  emit more than X tons? │  │
│  │  [Highlighted       │  │                         │  │
│  │   Section]          │◄─┤  [ ] Yes               │  │
│  │                     │  │  [ ] No                │  │
│  │                     │  │                         │  │
│  │                     │  │  📎 Reference: Pg 12   │  │
│  └─────────────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Key Features**:

- **Annotation linking**: Conditions visually linked to PDF regions
- **Floating condition panel**: Draggable/dockable overlay on PDF
- **Highlight sync**: Clicking condition highlights permit section; clicking PDF region shows related conditions
- **PDF.js integration**: Text selection, search, zoom controls
- **Mini-map**: Thumbnail showing condition distribution across pages

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [< Back]   Air Permit 0820-0001-DM                    [🔍 Search] [⬇ Zoom]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │                        PDF VIEWER (PDF.js)                            │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────┐                          │  │
│  │  │ [Highlighted condition text in permit]  │◄─── Condition #3         │  │
│  │  │ "Emissions shall not exceed 20%..."     │     highlighted          │  │
│  │  └─────────────────────────────────────────┘                          │  │
│  │                                                                       │  │
│  │                    ┌─────────────────────────────┐                    │  │
│  │                    │ ◇ Condition #3          ✕  │◄── Floating panel   │  │
│  │                    │ Type: Monitoring            │    (draggable)     │  │
│  │                    │ Quote: "Emissions shall..." │                    │  │
│  │                    │ Units: Debur-1, Debur-2     │                    │  │
│  │                    │ [Edit] [Link Task] [Next ▶] │                    │  │
│  │                    └─────────────────────────────┘                    │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────┐                                              Progress: 12/45     │
│  │ pg 1 │  [Page 3 of 9]                               ████████░░░░ 27%   │
│  │ pg 2 │                                                                  │
│  │●pg 3●│  ← Current page indicator                                        │
│  │ pg 4 │                                                                  │
│  └──────┘                                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Progressive Question Display

Instead of one-at-a-time:

```
┌─────────────────────────────────────────┐
│  Standard: NESHAP Subpart FFFFF         │
│  ═══════════════════════════════════════│
│                                         │
│  ✓ Q1: Facility type         [Answered] │
│  ✓ Q2: Emission sources      [Answered] │
│  ● Q3: Control equipment     [Current]  │
│  ○ Q4: Monitoring frequency  [Upcoming] │
│  ○ Q5: Recordkeeping         [Upcoming] │
│                                         │
│  ─────────────────────────────────────  │
│  Q3: What control equipment is used?    │
│                                         │
│  [Expandable answer section]            │
└─────────────────────────────────────────┘
```

**Benefits**:

- Users see progress at a glance
- Can jump back to previous questions
- Context of where they are in the flow

### 4.3 Condition Indexing Mode

For permit condition tagging:

```
┌─────────────────────────────────────────────────────────┐
│  PDF View                    │  Indexed Conditions      │
│  ────────────────────────────│  ────────────────────────│
│                              │                          │
│  Section 4.1.2               │  + Add Condition         │
│  ┌────────────────────────┐  │                          │
│  │ The permittee shall    │  │  ┌────────────────────┐  │
│  │ maintain records of... │──┼──│ Condition 4.1.2    │  │
│  └────────────────────────┘  │  │ Type: Recordkeeping│  │
│                              │  │ Freq: Ongoing      │  │
│                              │  │ [Edit] [Link Task] │  │
│                              │  └────────────────────┘  │
│                              │                          │
│  [Text selection creates     │  [Drag from PDF to create│
│   new condition]             │   condition]             │
└─────────────────────────────────────────────────────────┘
```

### 4.4 Improved Multi-Unit Workflow

For standards that apply per-unit:

```
┌─────────────────────────────────────────┐
│  Standard: Boiler MACT                  │
│  ═══════════════════════════════════════│
│                                         │
│  Units:                                 │
│  ┌───────────────────────────────────┐  │
│  │ 🏭 Mill Shop Boiler    ✓ Complete │  │
│  │ 🏭 Heat Treat Furnace  ● In Prog  │  │
│  │ 🏭 Annealing Oven      ○ Not Started│ │
│  │                                   │  │
│  │ [+ Add Unit] [Import from Prior]  │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Currently editing: Heat Treat Furnace  │
│  ─────────────────────────────────────  │
│  [Question interface for this unit]     │
└─────────────────────────────────────────┘
```

---

## 5. Technical Approach

### 5.1 PDF.js Integration

```typescript
// Recommended approach for v2

import * as pdfjsLib from 'pdfjs-dist'

// Key capabilities needed:
// - Render PDF pages to canvas
// - Text layer for selection/search
// - Annotation layer for highlights
// - Thumbnail navigation
// - Zoom/pan controls
```

**Component Structure**:

```
components/
  permit/
    PdfViewer.vue           // Core PDF.js wrapper
    PdfThumbnails.vue       // Page navigation
    PdfAnnotationLayer.vue  // Highlight overlays
    PdfToolbar.vue          // Zoom, search, download
    ConditionSelector.vue   // Text selection → condition
```

### 5.2 Overlay Panel System

```vue
<!-- Floating panel that can overlay or dock -->
<PermitOverlayPanel
  v-model:mode="panelMode"     <!-- 'overlay' | 'docked' | 'hidden' -->
  v-model:position="panelPos"  <!-- draggable position -->
>
  <QuestionFlow :standard="currentStandard" />
</PermitOverlayPanel>
```

### 5.3 State Management

```typescript
// Permit indexing store
interface PermitIndexingState {
  currentPermit: Permit | null
  currentPage: number
  annotations: Annotation[]
  conditions: IndexedCondition[]

  // Question flow state
  currentStandard: Standard | null
  responses: Map<string, Response>
  questionProgress: QuestionProgress[]
}
```

---

## 6. Implementation Phases

### Phase 1: PDF Viewer Foundation

- [ ] PDF.js component with basic viewing
- [ ] Zoom, pan, page navigation
- [ ] Text layer for search/selection
- [ ] Mobile-responsive controls

### Phase 2: Question Overlay

- [ ] Floating/docked panel component
- [ ] Question progress indicator
- [ ] Response capture with existing data model
- [ ] Link questions to PDF regions

### Phase 3: Condition Indexing

- [ ] Text selection → condition creation
- [ ] Condition list management
- [ ] Task linking
- [ ] Bulk operations

### Phase 4: Collaboration

- [ ] Real-time presence indicators
- [ ] Optimistic updates
- [ ] Conflict resolution

---

## 7. Open Questions

1. **PDF Storage**: Where are permit PDFs currently stored? Firebase Storage?
2. **Annotation Persistence**: How should highlights/annotations be stored?
3. **Offline Support**: Is offline viewing a requirement?
4. **Mobile Priority**: How important is mobile indexing?

---

## 8. Example Permits Needed

The `permit-applicability-tool/exported/storage_export/` directory exists but appears to only have bucket config.

**Action**: Need to source example permit PDFs for testing:

- Title V Air Permit
- NPDES Water Permit
- RCRA Hazardous Waste Permit
- Stormwater Permit

---

## 9. References

- **Source repo**: `permit-applicability-tool`
- **Target repo**: `ui/apps/v2`
- **PDF.js docs**: https://mozilla.github.io/pdf.js/
- **V2 component library**: shadcn/ui + ui-thing
