# Trellis Standard v1.0

**Official Specification**
**File Extension:** `.trellis`
**MIME Type:** `application/vnd.trellis+json`
**Based On:** JSON-LD + Notion Property Types + Content Addressing

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [Document Structure](#document-structure)
3. [Standard Node Properties](#standard-node-properties)
4. [Property Types](#property-types)
5. [Content Blocks](#content-blocks)
6. [Files & Media](#files--media)
7. [Embeddings](#embeddings)
8. [AI-Generated Properties](#ai-generated-properties)
9. [Collections & Schemas](#collections--schemas)
10. [Views & Projections](#views--projections)
11. [Complete Example](#complete-example)

---

## Core Principles

### 1. Everything is a Node

Every entity in Trellis (projects, tasks, files, embeddings) is a node with:

- Unique `@id` (URI)
- Semantic `@type`
- Standard content properties (title, description, content, metadata)
- Optional custom properties based on schema

### 2. Content is Structured

Rich text is not opaque strings - it's a graph of typed blocks that can be queried, transformed, and composed.

### 3. Self-Describing Data

Every `.trellis` file includes its schema definition. No external dependencies required for interpretation.

### 4. Content Addressing

Files use content hashes as IDs to enable deduplication and verify integrity.

### 5. AI as First-Class

Embeddings and AI-generated properties are native types with full provenance tracking.

---

## Document Structure

Every `.trellis` file follows this structure:

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "trellis": "tag:trellis.app,2024:",
    "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "rdfs": "http://www.w3.org/2000/01/rdf-schema#"
  },
  "@graph": [
    // Schemas (PropertyValueSpecification nodes)
    // Collections (Collection nodes with items)
    // Individual nodes (Projects, Tasks, Files, etc.)
  ]
}
```

### Context Namespaces

| Prefix    | URI                                           | Purpose                                  |
| --------- | --------------------------------------------- | ---------------------------------------- |
| `@vocab`  | `https://schema.org/`                         | Default vocabulary for common properties |
| `trellis` | `tag:trellis.app,2024:`                       | Trellis-specific extensions              |
| `rdf`     | `http://www.w3.org/1999/02/22-rdf-syntax-ns#` | RDF metadata                             |
| `rdfs`    | `http://www.w3.org/2000/01/rdf-schema#`       | Schema definitions                       |

---

## Standard Node Properties

**Every Trellis node MUST have these properties:**

```typescript
interface TrellisNode {
  '@id': string; // Unique identifier (URI)
  '@type': string; // Semantic type

  'trellis:title': string; // Plain text, max 280 chars, REQUIRED
  'trellis:description': string; // Plain text, max 1000 chars, REQUIRED
  'trellis:content': ContentDocument; // Rich structured content, REQUIRED
  'trellis:metadata': Metadata; // System metadata, REQUIRED

  // ... custom properties defined by schema
}
```

### Title

- **Type:** Plain text string
- **Max Length:** 280 characters
- **Purpose:** Primary identifier shown in lists, links, mentions
- **Required:** Yes

### Description

- **Type:** Plain text string
- **Max Length:** 1000 characters
- **Purpose:** Brief summary for previews, cards, search results
- **Required:** Yes (can be empty string)

### Content

- **Type:** `ContentDocument`
- **Purpose:** Full rich-text body with structured blocks
- **Required:** Yes (can be empty document with no blocks)

```json
{
  "trellis:content": {
    "@type": "Document",
    "blocks": [
      // Array of Block objects (see Content Blocks section)
    ]
  }
}
```

### Metadata

- **Type:** `Metadata` object
- **Purpose:** System-level information and organizational data
- **Required:** Yes

```json
{
  "trellis:metadata": {
    "createdTime": "2024-03-20T15:00:00Z", // ISO 8601, REQUIRED
    "createdBy": { "@id": "user:alice" }, // User reference, REQUIRED
    "lastEditedTime": "2024-03-21T10:30:00Z", // ISO 8601, REQUIRED
    "lastEditedBy": { "@id": "user:bob" }, // User reference, REQUIRED

    "icon": "📊", // Emoji or custom icon, OPTIONAL
    "cover": { "@id": "trellis:file/sha256:..." }, // Cover image reference, OPTIONAL
    "tags": ["active", "q1-2024"], // String array, OPTIONAL
    "archived": false, // Boolean, default false
    "favorite": false, // Boolean, default false

    "embedding": { "@id": "trellis:embedding/..." } // Embedding reference, OPTIONAL
  }
}
```

---

## Property Types

Trellis uses **Notion-compatible property types** for all custom fields:

### Text Types

#### `title`

- Primary identifier for the node
- Only ONE per schema
- Plain text, no formatting
- Max 280 characters

```json
{
  "name": "projectName",
  "valueType": "title",
  "required": true
}
```

#### `rich_text`

- Multi-line text with inline formatting
- Supports bold, italic, code, links
- Stored as ContentDocument with blocks

```json
{
  "name": "notes",
  "valueType": "rich_text",
  "description": "Project notes with formatting"
}
```

### Number Types

#### `number`

- Numeric values with optional formatting
- Formats: `number`, `number_with_commas`, `percent`, `dollar`, `euro`, `pound`, `yen`, `rupee`

```json
{
  "name": "budget",
  "valueType": "number",
  "format": "dollar"
}
```

### Selection Types

#### `select`

- Single choice from predefined options
- Each option has name and color

```json
{
  "name": "priority",
  "valueType": "select",
  "selectOptions": [
    { "name": "High", "color": "red" },
    { "name": "Medium", "color": "yellow" },
    { "name": "Low", "color": "gray" }
  ]
}
```

#### `multi_select`

- Multiple choices from predefined options
- Same structure as `select`

```json
{
  "name": "tags",
  "valueType": "multi_select",
  "selectOptions": [
    { "name": "Frontend", "color": "blue" },
    { "name": "Backend", "color": "purple" }
  ]
}
```

#### `status`

- Enhanced select with grouping and workflows
- Supports option groups for organization

```json
{
  "name": "status",
  "valueType": "status",
  "statusOptions": {
    "options": [
      { "id": "status:planning", "name": "Planning", "color": "yellow" },
      { "id": "status:active", "name": "Active", "color": "blue" },
      { "id": "status:done", "name": "Done", "color": "green" }
    ],
    "groups": [
      {
        "id": "group:in-progress",
        "name": "In Progress",
        "optionIds": ["status:planning", "status:active"]
      }
    ]
  }
}
```

### Date & Time Types

#### `date`

- Date or datetime values
- Supports timezone, format options

```json
{
  "name": "dueDate",
  "valueType": "date",
  "includeTime": true,
  "dateFormat": "YYYY-MM-DD"
}
```

### People Types

#### `people`

- References to users
- Cardinality: `one` or `many`

```json
{
  "name": "owner",
  "valueType": "people",
  "cardinality": "one",
  "required": true
}
```

### Media Types

#### `files`

- References to File nodes
- Supports file type filtering

```json
{
  "name": "attachments",
  "valueType": "files",
  "acceptedFileTypes": ["image/*", "application/pdf"]
}
```

### Boolean Types

#### `checkbox`

- True/false values
- Supports default value

```json
{
  "name": "isPublic",
  "valueType": "checkbox",
  "default": false
}
```

### Link Types

#### `url`

- Validated URL strings
- Must be valid HTTP(S) URL

```json
{
  "name": "repository",
  "valueType": "url",
  "description": "GitHub repository link"
}
```

#### `email`

- Validated email addresses

```json
{
  "name": "contactEmail",
  "valueType": "email"
}
```

#### `phone_number`

- Formatted phone numbers

```json
{
  "name": "phone",
  "valueType": "phone_number"
}
```

### Relational Types

#### `relation`

- Links to other collections
- Supports one-to-one, one-to-many, many-to-many
- Optional bi-directional sync

```json
{
  "name": "tasks",
  "valueType": "relation",
  "relation": {
    "targetCollection": "trellis:collection/tasks",
    "cardinality": "many",
    "syncedProperty": "project" // Two-way relation
  }
}
```

#### `rollup`

- Aggregated data from related nodes
- Requires a relation property

```json
{
  "name": "taskCount",
  "valueType": "rollup",
  "rollup": {
    "relationProperty": "tasks",
    "targetProperty": "id",
    "aggregation": "count"
  }
}
```

**Supported aggregations:**

- `count` - Count of related items
- `count_values` - Count of non-empty values
- `sum` - Sum of numeric values
- `avg` - Average of numeric values
- `min` - Minimum value
- `max` - Maximum value
- `median` - Median value
- `unique` - Count of unique values
- `show_original` - Display original value (for one-to-one)

### Computed Types

#### `formula`

- JavaScript expressions evaluated at runtime
- Access to all node properties and helper functions
- Supports return type hints

```json
{
  "name": "remaining",
  "valueType": "formula",
  "formula": "budget - spent",
  "formulaReturnType": "number",
  "format": "dollar"
}
```

**Helper functions available:**

- Array: `$sum`, `$avg`, `$min`, `$max`, `$count`, `$filter`, `$find`, `$map`, `$reduce`
- String: `$concat`, `$upper`, `$lower`, `$trim`
- Format: `$currency`, `$percent`, `$date`, `$round`
- Logic: `$if`, `$switch`
- Math: `$floor`, `$ceil`, `$abs`

#### `ai_generated`

- AI-computed values with provenance tracking
- Configurable triggers and generators
- Supports user overrides

```json
{
  "name": "aiSummary",
  "valueType": "ai_generated",
  "generator": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-5",
    "prompt": "Summarize this project:\n{title}\n{description}"
  },
  "triggers": {
    "sourceFields": ["title", "description", "content"],
    "onChange": false,
    "manual": true
  },
  "returnType": "text",
  "allowOverride": true
}
```

### System Types

#### `created_time`

- Auto-populated creation timestamp
- ISO 8601 format
- Read-only

#### `created_by`

- Auto-populated creator reference
- Points to User node
- Read-only

#### `last_edited_time`

- Auto-updated edit timestamp
- ISO 8601 format
- Read-only

#### `last_edited_by`

- Auto-updated editor reference
- Points to User node
- Read-only

#### `unique_id`

- Auto-incrementing numeric ID
- Optional prefix

```json
{
  "name": "ticketId",
  "valueType": "unique_id",
  "prefix": "TASK-"
}
// Generates: TASK-1, TASK-2, TASK-3...
```

---

## Content Blocks

Content is structured as an array of typed blocks. Each block has:

```typescript
interface Block {
  '@type': BlockType;
  '@id'?: string; // Optional ID for referencing
  // Block-specific properties
}
```

### Text Blocks

#### `Paragraph`

```json
{
  "@type": "Paragraph",
  "text": "This is a paragraph with some text.",
  "marks": [
    { "type": "bold", "start": 10, "end": 19 },
    { "type": "link", "start": 30, "end": 34, "url": "https://example.com" }
  ]
}
```

**Supported marks:**

- `bold` - Bold text
- `italic` - Italic text
- `underline` - Underlined text
- `strikethrough` - Strikethrough text
- `code` - Inline code
- `link` - Hyperlink with URL
- `color` - Text color (with `color` property)

#### `Heading`

```json
{
  "@type": "Heading",
  "level": 1, // 1-6
  "text": "Section Title",
  "marks": []
}
```

#### `Quote`

```json
{
  "@type": "Quote",
  "text": "Quoted text here",
  "marks": []
}
```

#### `Callout`

```json
{
  "@type": "Callout",
  "icon": "💡",
  "color": "blue",
  "content": {
    "@type": "Document",
    "blocks": [{ "@type": "Paragraph", "text": "Callout content" }]
  }
}
```

#### `Code`

```json
{
  "@type": "Code",
  "language": "javascript",
  "code": "const x = 42;\nconsole.log(x);"
}
```

### List Blocks

#### `BulletList`

```json
{
  "@type": "BulletList",
  "items": [
    {
      "@type": "ListItem",
      "text": "First item",
      "marks": []
    },
    {
      "@type": "ListItem",
      "text": "Second item",
      "marks": []
    }
  ]
}
```

#### `NumberedList`

```json
{
  "@type": "NumberedList",
  "items": [
    { "@type": "ListItem", "text": "Step one" },
    { "@type": "ListItem", "text": "Step two" }
  ]
}
```

#### `TodoList`

```json
{
  "@type": "TodoList",
  "items": [
    {
      "@type": "ListItem",
      "text": "Task to complete",
      "checked": false,
      "assignee": { "@id": "user:alice" }
    },
    {
      "@type": "ListItem",
      "text": "Completed task",
      "checked": true
    }
  ]
}
```

#### `ToggleList`

```json
{
  "@type": "ToggleList",
  "items": [
    {
      "@type": "ListItem",
      "text": "Click to expand",
      "content": {
        "@type": "Document",
        "blocks": [{ "@type": "Paragraph", "text": "Hidden content" }]
      }
    }
  ]
}
```

### Media Blocks

#### `Image`

```json
{
  "@type": "Image",
  "file": { "@id": "trellis:file/sha256:..." },
  "altText": "Description of image",
  "caption": "Image caption",
  "width": 800,
  "height": 600
}
```

#### `Video`

```json
{
  "@type": "Video",
  "file": { "@id": "trellis:file/sha256:..." },
  "caption": "Video caption",
  "autoplay": false,
  "loop": false
}
```

#### `Audio`

```json
{
  "@type": "Audio",
  "file": { "@id": "trellis:file/sha256:..." },
  "caption": "Audio caption"
}
```

#### `File`

```json
{
  "@type": "File",
  "file": { "@id": "trellis:file/sha256:..." },
  "caption": "File description"
}
```

#### `Embed`

```json
{
  "@type": "Embed",
  "url": "https://www.youtube.com/watch?v=...",
  "caption": "Embedded video",
  "provider": "youtube"
}
```

**Supported providers:**

- YouTube
- Vimeo
- Figma
- Miro
- Google Maps
- CodePen
- Generic iframe

### Data Blocks

#### `Table`

```json
{
  "@type": "Table",
  "headers": ["Name", "Value", "Status"],
  "rows": [
    ["Item 1", "100", "Active"],
    ["Item 2", "200", "Pending"]
  ],
  "hasHeader": true
}
```

#### `Collection`

```json
{
  "@type": "Collection",
  "collectionId": "trellis:collection/tasks",
  "viewId": "trellis:view/my-tasks",
  "filter": {
    "field": "assignee",
    "condition": "is",
    "value": { "@id": "user:me" }
  },
  "inline": true // Show inline vs. as link
}
```

#### `Formula`

```json
{
  "@type": "Formula",
  "expression": "$sum(...items.map(i => i.budget))",
  "format": "currency",
  "label": "Total Budget"
}
```

### Layout Blocks

#### `Columns`

```json
{
  "@type": "Columns",
  "columns": [
    {
      "@type": "Column",
      "width": 0.5, // Fraction of total width
      "content": {
        "@type": "Document",
        "blocks": [{ "@type": "Paragraph", "text": "Left column" }]
      }
    },
    {
      "@type": "Column",
      "width": 0.5,
      "content": {
        "@type": "Document",
        "blocks": [{ "@type": "Paragraph", "text": "Right column" }]
      }
    }
  ]
}
```

#### `Divider`

```json
{
  "@type": "Divider"
}
```

#### `Spacer`

```json
{
  "@type": "Spacer",
  "height": 24 // pixels
}
```

### Special Blocks

#### `Bookmark`

```json
{
  "@type": "Bookmark",
  "url": "https://example.com/article",
  "title": "Article Title",
  "description": "Article description",
  "image": { "@id": "trellis:file/sha256:..." },
  "favicon": "https://example.com/favicon.ico"
}
```

#### `Mention`

```json
{
  "@type": "Mention",
  "mentionType": "user", // user, page, date
  "target": { "@id": "user:alice" },
  "text": "@alice"
}
```

#### `SyncedBlock`

```json
{
  "@type": "SyncedBlock",
  "@id": "trellis:synced/block-001",
  "content": {
    "@type": "Document",
    "blocks": [
      { "@type": "Paragraph", "text": "This content syncs across pages" }
    ]
  }
}
```

---

## Files & Media

Files are first-class nodes with content-addressable IDs.

### File Node Structure

```json
{
  "@id": "trellis:file/sha256:a3f5b8c9d2e1f4a7b6c5d8e9f1a2b3c4",
  "@type": "File",

  "trellis:title": "project-mockup.fig",
  "trellis:description": "Final design mockups for homepage",
  "trellis:content": {
    "@type": "Document",
    "blocks": [] // Empty for binary files
  },
  "trellis:metadata": {
    "createdTime": "2024-03-15T10:30:00Z",
    "createdBy": { "@id": "user:alice" },
    "lastEditedTime": "2024-03-15T10:30:00Z",
    "lastEditedBy": { "@id": "user:alice" },
    "tags": ["design", "homepage"],
    "embedding": { "@id": "trellis:embedding/file-a3f5b8c9" }
  },

  // File-specific properties
  "mimeType": "application/octet-stream",
  "size": 2847392,
  "checksum": "sha256:a3f5b8c9d2e1f4a7b6c5d8e9f1a2b3c4",

  // Storage locations (priority order)
  "sources": [
    {
      "type": "cdn",
      "url": "https://cdn.trellis.app/files/a3f5b8c9d2e1.fig",
      "primary": true
    },
    {
      "type": "s3",
      "url": "s3://trellis-files/a3f5b8c9d2e1.fig",
      "backup": true
    }
  ],

  // Media-specific metadata (for images/video)
  "width": 1920,
  "height": 1080,
  "duration": 120, // seconds, for audio/video
  "altText": "Homepage hero section mockup",

  // AI-generated metadata
  "aiDescription": "A modern website homepage design with gradient backgrounds",
  "aiTags": ["ui-design", "landing-page", "modern"]
}
```

### File ID Format

Files use **SHA-256 content hashing** for IDs:

```
trellis:file/sha256:{hash}
```

Where `{hash}` is the hexadecimal SHA-256 checksum of the file contents.

**Benefits:**

- **Deduplication** - Same file uploaded twice = same ID
- **Integrity** - Can verify file hasn't been corrupted
- **Cache-friendly** - Content-addressable storage

### Storage Sources

Files can have multiple storage locations with priority ordering:

```json
{
  "sources": [
    {
      "type": "cdn", // Primary: Fast CDN
      "url": "https://cdn.trellis.app/files/...",
      "primary": true
    },
    {
      "type": "s3", // Backup: Cloud storage
      "url": "s3://bucket/...",
      "backup": true
    },
    {
      "type": "local", // Temporary: Local cache
      "path": "/uploads/...",
      "temporary": true,
      "expiresAt": "2024-03-20T00:00:00Z"
    }
  ]
}
```

**Supported source types:**

- `cdn` - Content delivery network
- `s3` - Amazon S3 or compatible
- `gcs` - Google Cloud Storage
- `azure` - Azure Blob Storage
- `local` - Local filesystem
- `ipfs` - InterPlanetary File System

### Referencing Files

Files are referenced by ID in properties and blocks:

```json
{
  "@id": "trellis:project/001",
  "@type": "Project",

  "trellis:metadata": {
    "cover": { "@id": "trellis:file/sha256:..." }
  },

  "attachments": [
    { "@id": "trellis:file/sha256:a3f5b8c9..." },
    { "@id": "trellis:file/sha256:b4e6c7d8..." }
  ]
}
```

---

## Embeddings

Embeddings are vector representations for semantic search and AI operations.

### Embedding Node Structure

```json
{
  "@id": "trellis:embedding/project-001",
  "@type": "Embedding",

  "trellis:title": "Embedding: Website Redesign",
  "trellis:description": "Semantic vector for project content",
  "trellis:content": {
    "@type": "Document",
    "blocks": []
  },
  "trellis:metadata": {
    "createdTime": "2024-03-20T15:00:00Z",
    "createdBy": { "@id": "system:ai-service" },
    "lastEditedTime": "2024-03-20T15:00:00Z",
    "lastEditedBy": { "@id": "system:ai-service" }
  },

  // Embedding-specific properties
  "model": "text-embedding-3-small",
  "dimensions": 1536,
  "vector": [0.023, -0.112, 0.445 /* ... 1533 more values */],

  "sourceText": "Website Redesign. Complete overhaul of company website...",
  "sourceNode": { "@id": "trellis:project/001" },

  "generatedAt": "2024-03-20T15:00:00Z",
  "provider": "openai",
  "cost": 0.00002
}
```

### Supported Models

| Provider  | Model                  | Dimensions | Cost (per 1M tokens) |
| --------- | ---------------------- | ---------- | -------------------- |
| OpenAI    | text-embedding-3-small | 1536       | $0.02                |
| OpenAI    | text-embedding-3-large | 3072       | $0.13                |
| Cohere    | embed-english-v3.0     | 1024       | $0.10                |
| Anthropic | (future)               | TBD        | TBD                  |

### Linking Embeddings

**Implicit linking** (recommended):

```json
{
  "@id": "trellis:project/001",
  "@type": "Project"

  // Embedding found by convention: trellis:embedding/{node-id}
}
```

**Explicit linking** (optional):

```json
{
  "@id": "trellis:project/001",
  "@type": "Project",

  "trellis:metadata": {
    "embedding": { "@id": "trellis:embedding/project-001" }
  }
}
```

### Semantic Search

Use embeddings for similarity search:

```typescript
// Find projects similar to current project
const currentEmbedding = await getEmbedding('trellis:project/001');
const allEmbeddings = await getEmbeddings({ type: 'Project' });

const similar = allEmbeddings
  .map((e) => ({
    node: e.sourceNode,
    similarity: cosineSimilarity(currentEmbedding.vector, e.vector),
  }))
  .sort((a, b) => b.similarity - a.similarity)
  .slice(0, 5);
```

---

## AI-Generated Properties

AI-generated properties track provenance and support user overrides.

### Property Definition

```json
{
  "@id": "trellis:field/ai-summary",
  "@type": "PropertyValue",
  "name": "aiSummary",
  "valueType": "ai_generated",

  "generator": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-5",
    "prompt": "Summarize this project concisely:\nTitle: {title}\nDescription: {description}\nContent: {content}"
  },

  "triggers": {
    "sourceFields": ["title", "description", "content"],
    "onChange": false, // Don't auto-regenerate (save costs)
    "manual": true // User can manually trigger
  },

  "returnType": "text",
  "allowOverride": true,

  "description": "AI-generated project summary"
}
```

### Property Value Format

```json
{
  "@id": "trellis:project/001",
  "@type": "Project",

  "aiSummary": {
    "value": "A comprehensive website modernization project focusing on performance and accessibility, targeting Q2 2024 launch.",

    "generated": {
      "at": "2024-03-20T15:30:00Z",
      "by": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-5",
        "version": "20250514"
      },
      "cost": 0.00015,
      "latency": 1200, // milliseconds
      "tokenCount": {
        "input": 150,
        "output": 35
      }
    },

    "overridden": false,
    "userValue": null // Set when user overrides AI value
  }
}
```

### Generator Configuration

#### Provider Options

- `anthropic` - Claude models
- `openai` - GPT models
- `cohere` - Cohere models
- `custom` - Custom endpoints

#### Trigger Options

```json
{
  "triggers": {
    "sourceFields": ["field1", "field2"], // Watch these fields
    "onChange": true, // Auto-regenerate on change
    "manual": true, // User can manually trigger
    "schedule": "0 0 * * *" // Cron expression (optional)
  }
}
```

#### Return Types

- `text` - Plain text string
- `rich_text` - Formatted content
- `number` - Numeric value
- `boolean` - True/false
- `select` - Single option from list
- `multi_select` - Multiple options
- `date` - Date/datetime value

### User Overrides

When user manually sets a value:

```json
{
  "aiSummary": {
    "value": "User-written summary that overrides AI",

    "generated": {
      "at": "2024-03-20T15:30:00Z",
      "by": { "provider": "anthropic", "model": "claude-sonnet-4-5" }
    },

    "overridden": true,
    "userValue": "User-written summary that overrides AI",
    "originalAIValue": "A comprehensive website modernization project..."
  }
}
```

---

## Collections & Schemas

### Schema Definition

```json
{
  "@id": "trellis:schema/projects",
  "@type": "PropertyValueSpecification",

  "name": "Projects",
  "version": "1.0.0",
  "description": "Project management schema",
  "icon": "📊",
  "color": "blue",

  "fields": [
    {
      "@id": "trellis:field/status",
      "@type": "PropertyValue",
      "name": "status",
      "valueType": "status",
      "required": true,
      "description": "Current project status",
      "statusOptions": {
        "options": [
          { "id": "status:planning", "name": "Planning", "color": "yellow" },
          { "id": "status:active", "name": "Active", "color": "blue" },
          { "id": "status:done", "name": "Done", "color": "green" }
        ]
      }
    },
    {
      "@id": "trellis:field/budget",
      "@type": "PropertyValue",
      "name": "budget",
      "valueType": "number",
      "format": "dollar",
      "description": "Total project budget"
    },
    {
      "@id": "trellis:field/remaining",
      "@type": "PropertyValue",
      "name": "remaining",
      "valueType": "formula",
      "formula": "budget - spent",
      "formulaReturnType": "number",
      "format": "dollar"
    }
    // ... more fields
  ]
}
```

### Collection Structure

```json
{
  "@id": "trellis:collection/projects",
  "@type": "Collection",

  "name": "Projects",
  "schema": { "@id": "trellis:schema/projects" },

  "views": [
    // View definitions (see Views & Projections section)
  ],

  "projections": [
    // Projection definitions (see Views & Projections section)
  ],

  "items": [
    // Array of node instances
    {
      "@id": "trellis:project/001",
      "@type": "Project"
      // ... node properties
    }
  ]
}
```

---

## Views & Projections

### Views

Views define how collection data is displayed in table/board/timeline formats.

#### Table View

```json
{
  "@id": "trellis:view/projects-table",
  "@type": "DatabaseView",
  "name": "All Projects",
  "viewType": "table",
  "isDefault": true,

  "visibleFields": ["name", "status", "owner", "dueDate", "budget"],

  "sort": [
    { "field": "priority", "direction": "ascending" },
    { "field": "dueDate", "direction": "ascending" }
  ],

  "filter": {
    "operator": "and",
    "conditions": [
      {
        "field": "status",
        "condition": "is_not",
        "value": "Done"
      },
      {
        "field": "budget",
        "condition": "greater_than",
        "value": 10000
      }
    ]
  },

  "groupBy": null
}
```

#### Board View

```json
{
  "@id": "trellis:view/projects-board",
  "@type": "DatabaseView",
  "name": "Status Board",
  "viewType": "board",

  "groupBy": "status",
  "visibleFields": ["name", "owner", "dueDate"],

  "filter": {
    "field": "archived",
    "condition": "is",
    "value": false
  }
}
```

#### Timeline View

```json
{
  "@id": "trellis:view/projects-timeline",
  "@type": "DatabaseView",
  "name": "Project Timeline",
  "viewType": "timeline",

  "startDateField": "startDate",
  "endDateField": "dueDate",
  "colorBy": "priority",

  "visibleFields": ["name", "owner", "status"]
}
```

### Projections

Projections define custom visualizations beyond standard views.

#### Card Grid

```json
{
  "@id": "trellis:projection/projects-cards",
  "@type": "CardGrid",
  "name": "Project Cards",

  "config": {
    "titleField": "name",
    "subtitleField": "status",
    "imageField": "cover",

    "fields": [
      {
        "field": "owner",
        "displayAs": "avatar"
      },
      {
        "field": "budget",
        "displayAs": "progress-bar",
        "colorThresholds": [
          { "max": 50, "color": "green" },
          { "max": 80, "color": "yellow" },
          { "min": 80, "color": "red" }
        ]
      }
    ],

    "badgeField": "priority",
    "layout": "grid",
    "columns": 3
  }
}
```

#### Sankey Diagram

```json
{
  "@id": "trellis:projection/budget-flow",
  "@type": "Sankey",
  "name": "Budget Allocation",

  "config": {
    "sourceField": "status",
    "targetField": "priority",
    "valueField": "spent",
    "colorScheme": "category20"
  }
}
```

#### Graph Visualization

```json
{
  "@id": "trellis:projection/project-network",
  "@type": "Graph",
  "name": "Project Dependencies",

  "config": {
    "nodeType": "project",
    "nodeLabelField": "name",
    "nodeColorField": "status",
    "nodeSizeField": "budget",

    "edgeSource": "dependencies",
    "edgeType": "blocks",

    "layout": "force",
    "showLabels": true,
    "clustering": true
  }
}
```

#### Dashboard

```json
{
  "@id": "trellis:projection/executive-dashboard",
  "@type": "Dashboard",
  "name": "Executive Overview",

  "config": {
    "layout": "grid",
    "blocks": [
      {
        "@type": "MetricBlock",
        "title": "Total Budget",
        "formula": "$currency($sum(...items.map(p => p.budget)))",
        "size": "small",
        "position": { "x": 0, "y": 0, "w": 1, "h": 1 }
      },
      {
        "@type": "ChartBlock",
        "title": "Budget by Status",
        "chartType": "bar",
        "dataSource": {
          "groupBy": "status",
          "aggregation": {
            "field": "budget",
            "function": "sum"
          }
        },
        "position": { "x": 0, "y": 1, "w": 2, "h": 2 }
      }
    ]
  }
}
```

---

## Complete Example

Here's a complete `.trellis` file demonstrating all features:

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "trellis": "tag:trellis.app,2024:",
    "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "rdfs": "http://www.w3.org/2000/01/rdf-schema#"
  },
  "@graph": [
    {
      "@id": "trellis:file/sha256:a3f5b8c9d2e1f4a7b6c5d8e9f1a2b3c4",
      "@type": "File",

      "trellis:title": "homepage-mockup.fig",
      "trellis:description": "Design mockups for new homepage",
      "trellis:content": {
        "@type": "Document",
        "blocks": []
      },
      "trellis:metadata": {
        "createdTime": "2024-03-15T10:30:00Z",
        "createdBy": { "@id": "user:alice" },
        "lastEditedTime": "2024-03-15T10:30:00Z",
        "lastEditedBy": { "@id": "user:alice" },
        "tags": ["design", "homepage"]
      },

      "mimeType": "application/octet-stream",
      "size": 2847392,
      "checksum": "sha256:a3f5b8c9d2e1f4a7b6c5d8e9f1a2b3c4",

      "sources": [
        {
          "type": "cdn",
          "url": "https://cdn.trellis.app/files/a3f5b8c9.fig",
          "primary": true
        }
      ],

      "width": 1920,
      "height": 1080,
      "altText": "Homepage design with hero section",

      "aiDescription": "Modern website homepage with gradient backgrounds",
      "aiTags": ["ui-design", "landing-page"]
    },

    {
      "@id": "trellis:embedding/project-001",
      "@type": "Embedding",

      "trellis:title": "Embedding: Website Redesign",
      "trellis:description": "Semantic vector for project",
      "trellis:content": {
        "@type": "Document",
        "blocks": []
      },
      "trellis:metadata": {
        "createdTime": "2024-03-20T15:00:00Z",
        "createdBy": { "@id": "system:ai" },
        "lastEditedTime": "2024-03-20T15:00:00Z",
        "lastEditedBy": { "@id": "system:ai" }
      },

      "model": "text-embedding-3-small",
      "dimensions": 1536,
      "vector": [0.023, -0.112, 0.445],
      "sourceNode": { "@id": "trellis:project/001" },
      "provider": "openai"
    },

    {
      "@id": "trellis:schema/projects",
      "@type": "PropertyValueSpecification",

      "name": "Projects",
      "version": "1.0.0",
      "description": "Project tracking with budgets and tasks",
      "icon": "📊",
      "color": "blue",

      "fields": [
        {
          "@id": "trellis:field/status",
          "@type": "PropertyValue",
          "name": "status",
          "valueType": "status",
          "required": true,
          "statusOptions": {
            "options": [
              {
                "id": "status:planning",
                "name": "Planning",
                "color": "yellow"
              },
              { "id": "status:active", "name": "Active", "color": "blue" },
              { "id": "status:done", "name": "Done", "color": "green" }
            ]
          }
        },
        {
          "@id": "trellis:field/priority",
          "@type": "PropertyValue",
          "name": "priority",
          "valueType": "select",
          "selectOptions": [
            { "name": "High", "color": "red" },
            { "name": "Medium", "color": "yellow" },
            { "name": "Low", "color": "gray" }
          ]
        },
        {
          "@id": "trellis:field/budget",
          "@type": "PropertyValue",
          "name": "budget",
          "valueType": "number",
          "format": "dollar"
        },
        {
          "@id": "trellis:field/spent",
          "@type": "PropertyValue",
          "name": "spent",
          "valueType": "number",
          "format": "dollar",
          "default": 0
        },
        {
          "@id": "trellis:field/remaining",
          "@type": "PropertyValue",
          "name": "remaining",
          "valueType": "formula",
          "formula": "budget - spent",
          "formulaReturnType": "number",
          "format": "dollar"
        },
        {
          "@id": "trellis:field/owner",
          "@type": "PropertyValue",
          "name": "owner",
          "valueType": "people",
          "cardinality": "one",
          "required": true
        },
        {
          "@id": "trellis:field/due-date",
          "@type": "PropertyValue",
          "name": "dueDate",
          "valueType": "date",
          "includeTime": false
        },
        {
          "@id": "trellis:field/attachments",
          "@type": "PropertyValue",
          "name": "attachments",
          "valueType": "files"
        },
        {
          "@id": "trellis:field/ai-summary",
          "@type": "PropertyValue",
          "name": "aiSummary",
          "valueType": "ai_generated",
          "generator": {
            "provider": "anthropic",
            "model": "claude-sonnet-4-5",
            "prompt": "Summarize: {title}\n{description}"
          },
          "triggers": {
            "sourceFields": ["title", "description"],
            "onChange": false,
            "manual": true
          },
          "returnType": "text",
          "allowOverride": true
        }
      ]
    },

    {
      "@id": "trellis:collection/projects",
      "@type": "Collection",

      "name": "Projects",
      "schema": { "@id": "trellis:schema/projects" },

      "views": [
        {
          "@id": "trellis:view/all-projects",
          "@type": "DatabaseView",
          "name": "All Projects",
          "viewType": "table",
          "isDefault": true,
          "visibleFields": [
            "name",
            "status",
            "priority",
            "owner",
            "budget",
            "remaining"
          ],
          "sort": [{ "field": "priority", "direction": "ascending" }]
        }
      ],

      "projections": [
        {
          "@id": "trellis:projection/project-cards",
          "@type": "CardGrid",
          "name": "Cards",
          "config": {
            "titleField": "name",
            "subtitleField": "status",
            "imageField": "cover",
            "columns": 3
          }
        }
      ],

      "items": [
        {
          "@id": "trellis:project/001",
          "@type": "Project",

          "trellis:title": "Website Redesign",
          "trellis:description": "Complete overhaul of company website",
          "trellis:content": {
            "@type": "Document",
            "blocks": [
              {
                "@type": "Heading",
                "level": 1,
                "text": "Project Overview"
              },
              {
                "@type": "Paragraph",
                "text": "This project modernizes our web presence with focus on performance."
              },
              {
                "@type": "TodoList",
                "items": [
                  {
                    "@type": "ListItem",
                    "text": "Complete design mockups",
                    "checked": true
                  },
                  {
                    "@type": "ListItem",
                    "text": "Implement responsive grid",
                    "checked": false
                  }
                ]
              },
              {
                "@type": "Image",
                "file": {
                  "@id": "trellis:file/sha256:a3f5b8c9d2e1f4a7b6c5d8e9f1a2b3c4"
                },
                "altText": "Homepage mockup",
                "caption": "Final design"
              }
            ]
          },
          "trellis:metadata": {
            "createdTime": "2024-01-15T08:00:00Z",
            "createdBy": { "@id": "user:alice" },
            "lastEditedTime": "2024-03-20T14:30:00Z",
            "lastEditedBy": { "@id": "user:bob" },
            "icon": "🎨",
            "cover": {
              "@id": "trellis:file/sha256:a3f5b8c9d2e1f4a7b6c5d8e9f1a2b3c4"
            },
            "tags": ["active", "frontend"],
            "embedding": { "@id": "trellis:embedding/project-001" }
          },

          "status": "Active",
          "priority": "High",
          "budget": 50000,
          "spent": 32000,
          "owner": { "@id": "user:alice" },
          "dueDate": "2024-06-30",
          "attachments": [
            { "@id": "trellis:file/sha256:a3f5b8c9d2e1f4a7b6c5d8e9f1a2b3c4" }
          ],

          "aiSummary": {
            "value": "Website modernization project targeting Q2 2024 launch.",
            "generated": {
              "at": "2024-03-20T15:30:00Z",
              "by": {
                "provider": "anthropic",
                "model": "claude-sonnet-4-5"
              },
              "cost": 0.00015
            },
            "overridden": false
          }
        }
      ]
    }
  ]
}
```

---

## Appendix A: Color Values

Standard color options for select/status fields:

| Color  | Hex       | Usage                    |
| ------ | --------- | ------------------------ |
| gray   | `#9B9A97` | Neutral, inactive        |
| brown  | `#64473A` | Earth tones              |
| orange | `#D9730D` | Warning, medium priority |
| yellow | `#DFAB01` | Caution, in progress     |
| green  | `#0F7B6C` | Success, completed       |
| blue   | `#0B6E99` | Info, active             |
| purple | `#6940A5` | Special, premium         |
| pink   | `#AD1A72` | Creative, design         |
| red    | `#E03E3E` | Error, high priority     |

---

## Appendix B: MIME Types

Common MIME types for files:

| Type   | MIME Type                  |
| ------ | -------------------------- |
| PNG    | `image/png`                |
| JPEG   | `image/jpeg`               |
| GIF    | `image/gif`                |
| SVG    | `image/svg+xml`            |
| PDF    | `application/pdf`          |
| MP4    | `video/mp4`                |
| MP3    | `audio/mpeg`               |
| Figma  | `application/octet-stream` |
| Sketch | `application/octet-stream` |

---

## Appendix C: Filter Conditions

Available filter conditions by property type:

### Text Properties

- `is` / `is_not`
- `contains` / `does_not_contain`
- `starts_with` / `ends_with`
- `is_empty` / `is_not_empty`

### Number Properties

- `equals` / `does_not_equal`
- `greater_than` / `less_than`
- `greater_than_or_equal` / `less_than_or_equal`
- `is_empty` / `is_not_empty`

### Select Properties

- `is` / `is_not`
- `is_any_of` / `is_none_of`
- `is_empty` / `is_not_empty`

### Date Properties

- `is` / `is_not`
- `is_before` / `is_after`
- `is_on_or_before` / `is_on_or_after`
- `is_within` (relative: "past_week", "next_month")
- `is_empty` / `is_not_empty`

### Checkbox Properties

- `is` (true/false)

### People Properties

- `contains` / `does_not_contain`
- `is_empty` / `is_not_empty`

---

## Appendix D: Formula Helper Reference

Complete list of formula helpers:

```javascript
// Array operations
$sum(...numbers)                  // Sum of values
$avg(...numbers)                  // Average
$min(...values)                   // Minimum
$max(...values)                   // Maximum
$count(array)                     // Count items

// Array transformations
$filter(array, predicate)         // Filter items
$find(array, predicate)           // Find first match
$map(array, transform)            // Transform items
$reduce(array, reducer, initial)  // Reduce array

// String operations
$concat(...strings, separator)    // Join strings
$upper(string)                    // Uppercase
$lower(string)                    // Lowercase
$trim(string)                     // Trim whitespace

// Formatting
$currency(number, locale?)        // Format as currency
$percent(decimal, decimals?)      // Format as percentage
$date(timestamp, format?)         // Format date
$round(number, decimals?)         // Round number

// Math
$floor(number)                    // Round down
$ceil(number)                     // Round up
$abs(number)                      // Absolute value

// Logic
$if(condition, trueVal, falseVal) // Conditional
$switch(value, cases, default?)   // Switch statement
```

---

**End of Trellis Standard v1.0**
