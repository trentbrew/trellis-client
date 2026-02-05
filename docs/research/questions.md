# Trellis v2.0 Directory Structure

Let's work through this systematically. I'll ask questions, you tell me your instincts, and we'll converge on a design.

---

## Question 1: What's the primary mental model?

**How do you think about organizing your knowledge/data?**

**Option A: Domain-centric**

```
I think in domains/areas:
- Personal (budget, habits, journal)
- Work (projects, clients, tasks)
- Learning (notes, research, books)
```

**Option B: Type-centric**

```
I think in types:
- All my notes (regardless of domain)
- All my tasks (work + personal mixed)
- All my people (contacts everywhere)
```

**Option C: Project-centric**

```
I think in projects/contexts:
- Website Redesign (notes + tasks + budget + people)
- Conference Talk (slides + research + schedule)
- Q4 Planning (goals + metrics + retrospectives)
```

**My instinct:** Most people are **project-centric** day-to-day, but need **type-centric views** for cross-cutting queries.

**What's your instinct?**

---

## Question 2: Where should user-created graphs live?

**Scenario:** User creates a budget tracker.

**Option A: Flat graphs directory**

```
~/.trellis/
└── graphs/
    ├── personal-budget.budget.trellis
    ├── work-projects.project.trellis
    └── contacts.people.trellis
```

✅ Simple (one place for all graphs)  
✅ Easy to browse  
❌ No organization (scales poorly)

**Option B: Type-based folders**

```
~/.trellis/
├── budgets/
│   └── personal-budget.budget.trellis
├── projects/
│   └── work-projects.project.trellis
└── people/
    └── contacts.people.trellis
```

✅ Organized by type  
✅ Discoverable  
❌ Forces single categorization (where does "trip planning" go?)

**Option C: User-defined folders**

```
~/.trellis/
├── personal/
│   └── budget-2025.budget.trellis
├── work/
│   ├── projects.project.trellis
│   └── clients.people.trellis
└── learning/
    └── book-notes.note.trellis
```

✅ Flexible (user decides structure)  
✅ Feels like normal filesystem  
❌ Namespace collisions (two `budget.trellis` files in different folders?)

**Option D: Flat + tags/metadata**

```
~/.trellis/
└── graphs/
    ├── budget-2025.budget.trellis        (tags: personal, finance)
    ├── work-projects.project.trellis     (tags: work)
    └── conference-prep.note.trellis      (tags: work, learning)
```

✅ No forced hierarchy  
✅ Multi-dimensional organization (tags)  
✅ Projections can filter by tag  
❌ Requires good tagging discipline

**Which feels right to you?**

---

## Question 3: Where should system collections live?

**System collections:** `trellis:Task`, `design:Theme`, `icons:Icon`, etc.

**Option A: Bundled with Trellis app** (read-only)

```
/Applications/Trellis.app/Contents/Resources/
└── system/
    ├── core.trellis              (trellis:Task, trellis:Note, etc.)
    ├── design-tokens.trellis     (design:Theme, design:Color, etc.)
    └── icon-registry.trellis     (icons:Icon)
```

User vault references these:

```json
{
  "imports": [{ "@id": "trellis-core", "path": "app://system/core.trellis" }]
}
```

✅ Single source of truth (users can't corrupt system ontologies)  
✅ Updates via app updates  
❌ Can't customize (without forking)

**Option B: Copied into each vault** (editable)

```
~/.trellis/
└── system/
    ├── core.trellis
    ├── design-tokens.trellis
    └── icon-registry.trellis
```

✅ Full control (user can extend/modify)  
✅ Vault is self-contained  
❌ Duplication across vaults  
❌ Hard to update (manual merge)

**Option C: Hybrid** (app-bundled + user overrides)

```
App: /Applications/Trellis.app/.../system/core.trellis
Vault: ~/.trellis/system/core-overrides.trellis
```

Merge strategy: User overrides win.

✅ Safe defaults  
✅ Extensible  
❌ Complex merge logic

**Which approach feels right?**

---

## Question 4: Where should indexes/caches live?

**Context:** TQL runtime builds indexes (EAV store, link graph, embeddings).

**Option A: Hidden** `.trellis/` **directory**

```
~/.trellis/
├── .trellis/
│   ├── indexes/
│   │   ├── eav.db
│   │   ├── links.db
│   │   └── embeddings.db
│   ├── cache/
│   └── logs/
└── graphs/
```

✅ Standard convention (like `.git/`)  
✅ Easy to ignore  
✅ Easy to blow away and rebuild

**Option B: App data directory** (OS-specific)

```
macOS: ~/Library/Application Support/Trellis/
Linux: ~/.local/share/trellis/
Windows: %APPDATA%/Trellis/
```

✅ Doesn't clutter vault  
✅ OS-appropriate location  
❌ Disconnected from vault (harder to reason about)

**Option C: Explicit** `_indexes/` **folder**

```
~/.trellis/
├── _indexes/
│   ├── eav.db
│   └── links.db
└── graphs/
```

✅ Visible (easier to understand)  
❌ No convention (not hidden by default)

**Which feels right?**

---

## Question 5: How should imports work?

**Scenario:** Your budget graph wants to use design tokens.

**Option A: Relative paths**

```json
{
  "imports": [
    { "@id": "design-tokens", "path": "../system/design-tokens.trellis" }
  ]
}
```

✅ Portable (vault is self-contained)  
❌ Breaks if you move files

**Option B: Vault-relative paths**

```json
{
  "imports": [
    { "@id": "design-tokens", "path": "system/design-tokens.trellis" }
  ]
}
```

✅ Portable  
✅ Doesn't break on renames  
❌ Requires vault root detection

**Option C: URI scheme**

```json
{
  "imports": [
    {
      "@id": "design-tokens",
      "path": "trellis://system/design-tokens.trellis"
    },
    { "@id": "trellis-core", "path": "app://system/core.trellis" }
  ]
}
```

✅ Explicit (vault vs app resources)  
✅ Extensible (`https://`, `file://`, etc.)  
❌ More complex

**Which feels right?**

---

## Question 6: Should there be a vault config file?

**Option A: Yes, explicit** `.trellis.yaml`

```yaml
# ~/.trellis/.trellis.yaml
version: '2.0'
name: "Trent's Vault"

paths:
  graphs: './graphs'
  system: './system'
  indexes: './.trellis/indexes'

imports:
  - { id: 'trellis-core', path: 'app://system/core.trellis' }
  - { id: 'design-tokens', path: './system/design-tokens.trellis' }

preferences:
  defaultTheme: 'design:theme/default'
  defaultIconSet: 'lucide'
```

✅ Explicit configuration  
✅ Easy to customize  
✅ Portable across systems

**Option B: No, convention over configuration**

```
(No config file, everything is convention-based)
```

✅ Simpler  
✅ Less to maintain  
❌ Harder to customize

**Which feels right?**

---

## My Current Thinking (Synthesized)

Based on our conversations and the Filegraph learnings, here's my hypothesis:

### **Proposed Structure**

```
~/.trellis/
├── .trellis.yaml                 # Vault config (optional)
├── .trellis/                     # Hidden indexes/cache
│   ├── indexes/
│   │   ├── eav.db
│   │   ├── links.db
│   │   └── embeddings.db
│   ├── cache/
│   └── logs/
├── graphs/                       # User graphs (flat)
│   ├── personal-budget.budget.trellis
│   ├── work-projects.project.trellis
│   ├── meeting-notes.note.trellis
│   └── swot-analysis.swot.trellis
└── system/                       # System resources (editable)
    ├── design-tokens.trellis
    ├── icon-registry.trellis
    └── namespaces.trellis        # Namespace registry
```

**App-bundled (read-only):**

```
/Applications/Trellis.app/Contents/Resources/system/
└── core.trellis                  # trellis:Task, trellis:Note, etc.
```

### **Key Decisions**

1.  **User graphs:** Flat directory (organized via tags/metadata, not folders)
2.  **System collections:** App-bundled (read-only) + user can override in vault `system/`
3.  **Indexes:** Hidden `.trellis/` directory (like `.git/`)
4.  **Imports:** Vault-relative paths + `app://` scheme for bundled resources
5.  **Config:** Optional `.trellis.yaml` for customization

### **Why This Works**

- ✅ **Simple mental model** (graphs are files in `graphs/`)
- ✅ **Flexible organization** (tags > folders)
- ✅ **Safe defaults** (app-bundled system collections)
- ✅ **Extensible** (user can override/extend in `system/`)
- ✅ **Portable** (vault is self-contained)
- ✅ **Familiar** (`.trellis/` is like `.git/`)

---

## Your Turn

**React to this proposal:**

1.  Does `graphs/` being flat feel right? Or should there be user-defined folders?
2.  Does app-bundled system collections make sense? Or should they be per-vault?
3.  Does `.trellis/` for indexes feel right? Or separate app data directory?
4.  Anything else feel off?

**Let's iterate until it feels crisp.**
