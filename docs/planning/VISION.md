# RasterTV Vision & Context

> "Twitch for public access TV"

**Note:** This is historical context from an earlier RasterTV/cablecast-proxy iteration. The active focus of this repo is the ECMS redesign sandbox, and Cablecast integration has been removed from the active codebase (archived under `.archive/`).

## The Problem

Public access TV stations like Speak MPLS currently manage content through a painful manual process:

1. **VPN + Remote Desktop** → Connect to on-site server
2. **File Wrangling** → Download from links, convert via FFmpeg
3. **Manual Cablecast Entry** → Create shows, assign metadata, schedule
4. **Email Confirmations** → Copy/paste details to producers
5. **Spreadsheet Tracking** → Color-coded rows, manual producer logs

This doesn't scale. It's error-prone. It gates community voices behind technical friction.

## The Solution

**raster.tv** — a customizable TV Guide CMS that:

- Empowers broadcasters with self-service scheduling
- Gives producers direct control over their shows
- Provides viewers with an engaging, accessible guide
- Enables sponsors with campaign management

## Where cablecast-proxy Fits

```
┌─────────────────────────────────────────────────────────────┐
│                      RASTER.TV PLATFORM                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ TV Guide UI │  │ Producer    │  │ Broadcaster         │  │
│  │ (Nuxt)      │  │ Portal      │  │ Dashboard           │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         └────────────────┼─────────────────────┘             │
│                          │                                   │
│                          ▼                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              CABLECAST-PROXY (this service)            │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │ Multi-tenant routing + JSON-LD + TQL graph      │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                   │
│         ┌────────────────┼────────────────┐                 │
│         ▼                ▼                ▼                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ Speak MPLS   │ │ STL TV MO    │ │ Channel 36   │ ...    │
│  │ (Cablecast)  │ │ (Cablecast)  │ │ (Cablecast)  │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### This Service Provides:

| Capability            | Implementation                               |
| --------------------- | -------------------------------------------- |
| **Unified API**       | Route any tenant through `/api/:tenant/*`    |
| **Multi-tenant**      | Single endpoint for cross-station queries    |
| **Semantic Data**     | JSON-LD enrichment for show/channel/schedule |
| **Graph Queries**     | TQL EAV store for relationship traversal     |
| **Health Monitoring** | Aggregate status across all stations         |

## User Types & Features

### 🎛️ Broadcasters

- Cablecast API sync (shows, schedules, VODs)
- Configurable embeddable TV Guide widget
- Team & permission management
- Analytics dashboard

### 🎬 Producers

- VOD upload with metadata
- Schedule participation (request time slots)
- Per-show analytics
- Public portfolio page

### 📺 Viewers

- Interactive, filterable TV Guide
- Mini-player with live streaming
- Show subscriptions & notifications
- Accessibility features (CC, screen reader)

### 🤝 Sponsors

- Ad campaign manager
- Performance reports
- In-player branding options

## Revenue Model

| Tier      | Price   | Features                                              |
| --------- | ------- | ----------------------------------------------------- |
| **Free**  | $0      | Basic guide, limited customization                    |
| **Basic** | $49/mo  | Cablecast integration, analytics, widgets             |
| **Pro**   | $199/mo | Full customization, white-label, interactive features |

## Tech Stack

- **Frontend**: Nuxt, TailwindCSS, DaisyUI, ECharts
- **Backend**: Nitro (this proxy), PocketBase
- **AI**: OpenAI/Gemini for captions & analytics
- **Infrastructure**: Vercel, Pockethost.io

## Phase Roadmap

1. ✅ **Phase 1 - Platform Development** → cablecast-proxy (COMPLETE)
2. 🔄 **Phase 2 - Creator Tools** → Producer portal, scheduling UI
3. ⏳ **Phase 3 - Viewer Engagement** → Interactive features, chat, polls
4. ⏳ **Phase 4 - Pilot** → Speak MPLS as first customer
5. ⏳ **Phase 5 - Full Launch** → Multi-tenant SaaS

## First Customer: Speak MPLS

Speak MPLS (Minneapolis public access) serves as the MVP validation case:

- Channels: 16, 17, 75
- Current pain: VPN → remote desktop → manual Cablecast → spreadsheets
- Goal: Self-service scheduling, automated confirmations, producer dashboards

---

_This document lives with the cablecast-proxy codebase as the foundational infrastructure context._
