# RasterTV Refactoring Plan

> Transforming the current Nuxt project from Trellis CMS → RasterTV Platform

**Note:** This plan is historical context from an earlier RasterTV/cablecast-proxy iteration. The active focus of this repo is the ECMS redesign sandbox, and Cablecast integration has been removed from the active codebase (archived under `.archive/`).

## Current State Assessment

### What Exists Today

| Layer               | Current State                           | Notes                                              |
| ------------------- | --------------------------------------- | -------------------------------------------------- |
| **Branding**        | "Trellis"                               | Generic CMS workspace                              |
| **cablecast-proxy** | ✅ Complete                             | Express server, multi-tenant, JSON-LD, TQL         |
| **Database**        | InstantDB                               | Schema: orgs, apps, collections, members, settings |
| **UI Framework**    | Nuxt 4 + TailwindCSS + UI Thing         | Solid foundation                                   |
| **Pages**           | Collections, Types, Workflows, Settings | General CMS features                               |
| **Auth**            | InstantDB auth                          | Basic setup                                        |

### What's Missing for RasterTV

- [ ] TV Guide UI (viewer-facing)
- [ ] Producer Portal
- [ ] Broadcaster Dashboard
- [ ] Sponsor Campaign Manager
- [ ] cablecast-proxy integration in Nuxt
- [ ] Multi-tenant tenant selection
- [ ] Embeddable widgets
- [ ] Analytics dashboards
- [ ] Video player integration

---

## Refactoring Strategy

### Option A: **Pivot Trellis → RasterTV** (Recommended)

Repurpose existing Collections/Types architecture:

- Collection = Channel/Show container
- Types = Show, Episode, Schedule, Producer, etc.
- Keep existing UI components, rebrand and extend

### Option B: **Fresh RasterTV App**

Start new Nuxt app, import only reusable UI components from Trellis.

**Recommendation:** Option A - the existing architecture maps well to TV content management.

---

## Phase 2 Implementation Plan

### 2.1 Foundation Refactoring (Week 1-2)

#### 2.1.1 Rebranding

```
- [ ] Update nuxt.config.ts titleTemplate: 'Trellis' → 'RasterTV'
- [ ] Update package.json name and metadata
- [ ] Replace logo/favicon assets
- [ ] Update color scheme for TV/media aesthetic
```

#### 2.1.2 Schema Evolution

Extend InstantDB schema for RasterTV entities:

```typescript
// New entities to add to instant.schema.ts
stations: i.entity({
  ownerId: i.string().indexed(),
  tenantId: i.string().indexed(), // Maps to cablecast-proxy tenant
  name: i.string(),
  slug: i.string().indexed(),
  logo: i.string().optional(),
  location: i.string().optional(),
  timezone: i.string().optional(),
  cablecastUrl: i.string().optional(),
  status: i.string().optional(), // active, pending, suspended
  createdAt: i.number().optional(),
});

channels: i.entity({
  ownerId: i.string().indexed(),
  stationId: i.string().indexed(),
  cablecastId: i.number().indexed(), // ID from Cablecast API
  name: i.string(),
  number: i.string().optional(),
  description: i.string().optional(),
  thumbnail: i.string().optional(),
  streamUrl: i.string().optional(),
  isLive: i.boolean().optional(),
});

shows: i.entity({
  ownerId: i.string().indexed(),
  stationId: i.string().indexed(),
  cablecastId: i.number().indexed(),
  title: i.string(),
  description: i.string().optional(),
  category: i.string().optional(),
  producerId: i.string().indexed().optional(),
  thumbnail: i.string().optional(),
  duration: i.number().optional(),
  rating: i.string().optional(),
  tags: i.json().optional(),
});

scheduleItems: i.entity({
  ownerId: i.string().indexed(),
  stationId: i.string().indexed(),
  channelId: i.string().indexed(),
  showId: i.string().indexed(),
  cablecastId: i.number().indexed(),
  startTime: i.number().indexed(),
  endTime: i.number().indexed(),
  status: i.string().optional(), // scheduled, live, completed
});

producers: i.entity({
  ownerId: i.string().indexed(),
  stationId: i.string().indexed(),
  userId: i.string().indexed(),
  name: i.string(),
  bio: i.string().optional(),
  avatar: i.string().optional(),
  contactEmail: i.string().optional(),
  socialLinks: i.json().optional(),
  isVerified: i.boolean().optional(),
});
```

#### 2.1.3 Cablecast Integration Layer

Create composables to bridge Nuxt ↔ cablecast-proxy:

```
app/composables/
├── useCablecast.ts          # Core proxy client
├── useCablecastShows.ts     # Show queries
├── useCablecastSchedule.ts  # Schedule queries
├── useCablecastChannels.ts  # Channel queries
└── useCablecastSync.ts      # Sync Cablecast → InstantDB
```

---

### 2.2 Route Architecture (Week 2-3)

#### Public Routes (Viewers)

```
/                           # Landing page → redirect to /guide or marketing
/guide                      # TV Guide (main viewer interface)
/guide/[channel]            # Channel detail + schedule
/guide/[channel]/[show]     # Show detail page
/watch/[channel]            # Live player
/shows                      # Browse all shows
/shows/[slug]               # Show detail
/producers/[slug]           # Producer portfolio page
```

#### Authenticated Routes (Producers)

```
/portal                     # Producer dashboard home
/portal/shows               # My shows
/portal/shows/[id]          # Edit show
/portal/shows/new           # Create show
/portal/schedule            # Request time slots
/portal/analytics           # My analytics
/portal/profile             # Edit producer profile
```

#### Admin Routes (Broadcasters)

```
/dashboard                  # Broadcaster dashboard home
/dashboard/schedule         # Master schedule view
/dashboard/schedule/[date]  # Day schedule editor
/dashboard/shows            # All shows management
/dashboard/producers        # Producer management
/dashboard/channels         # Channel configuration
/dashboard/sync             # Cablecast sync status
/dashboard/analytics        # Station analytics
/dashboard/settings         # Station settings
/dashboard/widgets          # Widget configurator
```

#### Embed Routes (Widgets)

```
/embed/guide                # Embeddable TV guide widget
/embed/now-playing          # Now playing widget
/embed/schedule/[channel]   # Channel schedule widget
```

---

### 2.3 Core Components (Week 3-4)

#### TV Guide Components

```
app/components/Guide/
├── GuideGrid.vue           # EPG-style grid view
├── GuideTimeline.vue       # Horizontal timeline
├── GuideChannelRow.vue     # Single channel row
├── GuideShowCard.vue       # Show card in grid
├── GuideNowPlaying.vue     # Currently airing indicator
├── GuideTimeSlot.vue       # Time slot selector
├── GuideFilters.vue        # Category/time filters
└── GuideMiniPlayer.vue     # Floating video player
```

#### Schedule Components

```
app/components/Schedule/
├── ScheduleCalendar.vue    # Calendar view
├── ScheduleDayView.vue     # Single day timeline
├── ScheduleWeekView.vue    # Week overview
├── ScheduleSlotEditor.vue  # Edit time slot
├── ScheduleConflict.vue    # Conflict indicator
└── ScheduleRequest.vue     # Producer request form
```

#### Producer Components

```
app/components/Producer/
├── ProducerCard.vue        # Producer profile card
├── ProducerShowList.vue    # Producer's shows
├── ProducerPortfolio.vue   # Public portfolio
├── ProducerAnalytics.vue   # Stats dashboard
└── ProducerUpload.vue      # VOD upload form
```

#### Widget Components

```
app/components/Widget/
├── WidgetGuide.vue         # Embeddable guide
├── WidgetNowPlaying.vue    # Now playing
├── WidgetConfigurator.vue  # Widget builder UI
└── WidgetPreview.vue       # Preview container
```

---

### 2.4 Layout Strategy

```
app/layouts/
├── default.vue             # Authenticated app shell (keep, modify)
├── auth.vue                # Auth pages (keep)
├── marketing.vue           # Public marketing (keep)
├── guide.vue               # NEW: Viewer-facing TV guide
├── portal.vue              # NEW: Producer portal
├── dashboard.vue           # NEW: Broadcaster dashboard
├── embed.vue               # NEW: Widget embed (minimal chrome)
└── fullscreen.vue          # Video player (keep)
```

---

### 2.5 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Nuxt App                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  InstantDB   │    │ useCablecast │    │   Pinia      │       │
│  │  (primary)   │◄───│  composable  │───►│  (UI state)  │       │
│  └──────┬───────┘    └──────┬───────┘    └──────────────┘       │
│         │                   │                                    │
│         │     ┌─────────────┴─────────────┐                     │
│         │     │                           │                     │
│         ▼     ▼                           ▼                     │
│  ┌──────────────────┐          ┌──────────────────┐             │
│  │ Local entities   │          │ Cablecast data   │             │
│  │ (producers,      │          │ (shows, schedule │             │
│  │  stations, etc)  │          │  channels - live)│             │
│  └──────────────────┘          └──────────────────┘             │
│                                         │                        │
└─────────────────────────────────────────┼────────────────────────┘
                                          │
                                          ▼
                              ┌──────────────────────┐
                              │   cablecast-proxy    │
                              │   localhost:1919     │
                              └──────────┬───────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
             ┌──────────┐         ┌──────────┐         ┌──────────┐
             │SpeakMPLS │         │ STL TV   │         │Channel36 │
             └──────────┘         └──────────┘         └──────────┘
```

---

## Implementation Order

### Sprint 1: Foundation (Weeks 1-2)

1. [ ] Rebrand Trellis → RasterTV
2. [ ] Add new InstantDB entities (stations, channels, shows, etc.)
3. [ ] Create `useCablecast` composable family
4. [ ] Set up cablecast-proxy as dev dependency / concurrent process

### Sprint 2: TV Guide MVP (Weeks 3-4)

5. [ ] Create `guide` layout
6. [ ] Build GuideGrid component
7. [ ] Implement `/guide` page
8. [ ] Add channel/show detail pages
9. [ ] Basic video player integration

### Sprint 3: Producer Portal (Weeks 5-6)

10. [ ] Create `portal` layout
11. [ ] Producer dashboard pages
12. [ ] Show management CRUD
13. [ ] Schedule request workflow

### Sprint 4: Broadcaster Dashboard (Weeks 7-8)

14. [ ] Create `dashboard` layout
15. [ ] Master schedule view
16. [ ] Cablecast sync management
17. [ ] Producer approval workflow

### Sprint 5: Polish & Widgets (Weeks 9-10)

18. [ ] Embeddable widgets
19. [ ] Analytics dashboards
20. [ ] Email notifications setup
21. [ ] Widget configurator

---

## File Migration Map

### Keep As-Is

- `app/components/Ui/*` - All UI primitives
- `app/composables/useInstant*.ts` - InstantDB utilities
- `app/layouts/auth.vue`, `fullscreen.vue`
- `app/middleware/*` - Auth middleware
- `app/plugins/*`

### Modify

- `nuxt.config.ts` - Rebrand, add cablecast proxy config
- `instant.schema.ts` - Add TV entities
- `app/layouts/default.vue` - Adapt for RasterTV navigation
- `app/pages/index.vue` - Redirect to /guide or landing

### Archive/Remove

- `app/pages/collections/*` - May repurpose or archive
- `app/pages/types/*` - May repurpose or archive
- `app/pages/workflows/*` - Archive for now

### Create New

- All `/guide/*`, `/portal/*`, `/dashboard/*`, `/embed/*` pages
- All Guide, Schedule, Producer, Widget components
- `useCablecast*.ts` composables
- New layouts: guide, portal, dashboard, embed

---

## Environment Setup

```bash
# .env additions
CABLECAST_PROXY_URL=http://localhost:1919
DEFAULT_TENANT=speakmpls
```

```json
// package.json script additions
{
  "scripts": {
    "dev": "concurrently \"nuxt dev --port 4444\" \"pnpm --filter cablecast-proxy dev\"",
    "dev:nuxt": "nuxt dev --port 4444",
    "dev:proxy": "pnpm --filter cablecast-proxy dev"
  }
}
```

---

## Risk Mitigation

| Risk                         | Mitigation                                           |
| ---------------------------- | ---------------------------------------------------- |
| InstantDB schema migration   | Use additive changes only, no destructive migrations |
| cablecast-proxy availability | Cache responses in InstantDB, graceful degradation   |
| Cablecast API rate limits    | Implement sync batching, use TQL cache               |
| Large schedule datasets      | Virtualized lists, pagination, date-range queries    |

---

## Success Criteria for Phase 2

- [ ] Viewer can browse TV guide and see schedule
- [ ] Viewer can watch live stream (if available)
- [ ] Producer can log in and see their shows
- [ ] Producer can request schedule slots
- [ ] Broadcaster can view master schedule
- [ ] Broadcaster can sync from Cablecast
- [ ] Speak MPLS data displays correctly

---

## Next Steps

1. **Review this plan** - Confirm direction and priorities
2. **Set up dev environment** - Concurrent proxy + Nuxt
3. **Start Sprint 1** - Rebrand + schema + composables

---

_Generated: 2026-01-14_
