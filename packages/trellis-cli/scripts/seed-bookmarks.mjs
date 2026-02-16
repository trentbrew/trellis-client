/**
 * Seed bookmarks into the TQL graph via the trellis CLI client.
 *
 * Demonstrates agent-driven data entry: an external process creates
 * entities that immediately appear in the browser UI via SSE.
 *
 * Run: node packages/trellis-cli/scripts/seed-bookmarks.mjs
 * Requires: dev server on http://localhost:4141
 */

import { TrellisClient } from '../src/client.mjs'

const client = new TrellisClient({ agentId: 'cascade' })

const bookmarks = [
  {
    id: 'entity:bm-cli-1',
    data: {
      type: 'bookmark',
      title: 'Designing Data-Intensive Applications',
      description: 'Martin Kleppmann\'s essential guide to distributed systems, replication, partitioning, and batch/stream processing.',
      url: 'https://dataintensive.net',
      siteName: 'dataintensive.net',
      favicon: 'https://dataintensive.net/favicon.ico',
      thumbnail: 'https://m.media-amazon.com/images/I/91YfNb49PLL._SL1500_.jpg',
      excerpt: 'A book about the big ideas behind reliable, scalable, and maintainable data systems.',
      pinned: true,
      startDate: '2026-02-10',
      allDay: true,
      priority: 'medium',
      urgency: 'not-urgent',
      category: 'personal',
      tags: ['books', 'distributed-systems', 'architecture'],
    },
  },
  {
    id: 'entity:bm-cli-2',
    data: {
      type: 'bookmark',
      title: 'JSON-LD Playground',
      description: 'Interactive tool for experimenting with JSON-LD — the linked data format that powers the Trellis ontology layer.',
      url: 'https://json-ld.org/playground/',
      siteName: 'json-ld.org',
      favicon: 'https://json-ld.org/favicon.ico',
      excerpt: 'Play with JSON-LD markup by typing or pasting it into the input field.',
      pinned: false,
      startDate: '2026-02-10',
      allDay: true,
      priority: 'low',
      urgency: 'not-urgent',
      category: 'work',
      tags: ['tools', 'linked-data', 'json-ld'],
    },
  },
  {
    id: 'entity:bm-cli-3',
    data: {
      type: 'bookmark',
      title: 'The Local-First Web',
      description: 'Ink & Switch research on local-first software — apps that work offline, sync peer-to-peer, and give users ownership of their data.',
      url: 'https://www.inkandswitch.com/local-first/',
      siteName: 'Ink & Switch',
      favicon: 'https://www.inkandswitch.com/favicon.ico',
      thumbnail: 'https://www.inkandswitch.com/local-first/static/local-first-og.jpg',
      excerpt: 'We believe in a future of local-first software that gives users full ownership of their data.',
      pinned: true,
      startDate: '2026-02-09',
      allDay: true,
      priority: 'high',
      urgency: 'not-urgent',
      category: 'personal',
      tags: ['research', 'local-first', 'crdt', 'sync'],
    },
  },
  {
    id: 'entity:bm-cli-4',
    data: {
      type: 'bookmark',
      title: 'Tailwind CSS',
      description: 'A utility-first CSS framework packed with classes that can be composed to build any design, directly in your markup.',
      url: 'https://tailwindcss.com',
      siteName: 'tailwindcss.com',
      favicon: 'https://tailwindcss.com/favicons/favicon-32x32.png',
      thumbnail: 'https://tailwindcss.com/_next/static/media/social-card-large.a6e71726.jpg',
      excerpt: 'Rapidly build modern websites without ever leaving your HTML.',
      pinned: false,
      startDate: '2026-02-08',
      allDay: true,
      priority: 'medium',
      urgency: 'not-urgent',
      category: 'work',
      tags: ['css', 'framework', 'frontend'],
    },
  },
  {
    id: 'entity:bm-cli-5',
    data: {
      type: 'bookmark',
      title: 'Build an Agent in 10 mins with AI SDK 5',
      description: 'A walkthrough of building an AI agent using the Vercel AI SDK in under 10 minutes.',
      url: 'https://www.youtube.com/watch?v=TjAbtsPC-Sw',
      siteName: 'YouTube',
      favicon: 'https://www.youtube.com/favicon.ico',
      thumbnail: 'https://i.ytimg.com/vi/TjAbtsPC-Sw/maxresdefault.jpg',
      excerpt: 'Learn how to build a fully functional AI agent with tools, memory, and streaming.',
      pinned: false,
      startDate: '2026-02-07',
      allDay: true,
      priority: 'medium',
      urgency: 'not-urgent',
      category: 'work',
      tags: ['ai', 'agents', 'vercel'],
    },
  },
  {
    id: 'entity:bm-cli-6',
    data: {
      type: 'bookmark',
      title: 'Jazz — Whip up an app',
      description: 'Jazz gives you data without needing a database — plus auth, permissions, files and multiplayer without needing a backend.',
      url: 'https://jazz.tools/',
      siteName: 'jazz.tools',
      favicon: 'https://jazz.tools/favicon.ico',
      thumbnail: 'https://jazz.tools/opengraph-image',
      excerpt: 'Build local-first apps with sync, auth, and permissions built in.',
      pinned: true,
      startDate: '2026-02-06',
      allDay: true,
      priority: 'high',
      urgency: 'not-urgent',
      category: 'personal',
      tags: ['local-first', 'sync', 'framework'],
    },
  },
  {
    id: 'entity:bm-cli-7',
    data: {
      type: 'bookmark',
      title: 'Vue.js — The Progressive JavaScript Framework',
      description: 'An approachable, performant and versatile framework for building web user interfaces.',
      url: 'https://vuejs.org',
      siteName: 'vuejs.org',
      favicon: 'https://vuejs.org/logo.svg',
      thumbnail: 'https://vuejs.org/images/logo.png',
      excerpt: 'Vue.js is a progressive framework for building user interfaces.',
      pinned: false,
      startDate: '2026-02-05',
      allDay: true,
      priority: 'low',
      urgency: 'not-urgent',
      category: 'work',
      tags: ['vue', 'javascript', 'framework'],
    },
  },
]

async function run() {
  console.log('Seeding bookmarks via trellis CLI client...\n')

  // Check server is up
  try {
    await client.health()
  } catch {
    console.error('Error: dev server not reachable at http://localhost:4141')
    process.exit(1)
  }

  for (const bm of bookmarks) {
    // Check if it already exists
    try {
      await client.getNode(bm.id)
      console.log(`  ⏭  ${bm.data.title} (already exists)`)
      continue
    } catch {
      // Doesn't exist — create it
    }

    const result = await client.createNode(bm.id, 'entity', bm.data)
    if (result.ok) {
      console.log(`  ✓  ${bm.data.title}`)
    } else {
      console.error(`  ✗  ${bm.data.title}`)
    }
  }

  console.log(`\nDone — ${bookmarks.length} bookmarks processed.`)
}

run().catch((err) => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
