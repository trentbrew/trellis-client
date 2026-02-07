#!/usr/bin/env bun

/**
 * HQ Query — simple CLI to query the TQL knowledge graph.
 *
 * Usage: bun run hooks/tql-query.ts "FIND File AS ?f WHERE ?f.language = \"typescript\" RETURN ?f.path, ?f.writeCount ORDER BY ?f.writeCount DESC LIMIT 10"
 */

import { createKernel } from './_kernel.js';

const query = process.argv[2];

if (!query) {
  // Default: show stats
  const kernel = createKernel();
  const stats = kernel.getStore().getStats();

  console.log('HQ Status');
  console.log('━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Facts:      ${stats.totalFacts}`);
  console.log(`  Links:      ${stats.totalLinks}`);
  console.log(`  Entities:   ${stats.uniqueEntities}`);
  console.log(`  Attributes: ${stats.uniqueAttributes}`);

  // Count by type
  const typeFacts = kernel.getStore().getFactsByAttribute('type');
  const typeCounts: Record<string, number> = {};
  for (const fact of typeFacts) {
    const t = String(fact.v);
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }

  console.log('\n  Entity Types:');
  for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${type}: ${count}`);
  }

  kernel.close();
  process.exit(0);
}

// Run EQL-S query
const kernel = createKernel();

try {
  const result = kernel.query(query);
  const resolved = result instanceof Promise ? await result : result;

  console.log(`Query: ${query}`);
  console.log(`Results: ${resolved.rows.length} rows (${resolved.executionTime}ms)\n`);

  if (resolved.rows.length === 0) {
    console.log('  (no results)');
  } else {
    // Print as table
    for (const row of resolved.rows) {
      const entries = Object.entries(row)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | ');
      console.log(`  ${entries}`);
    }
  }
} catch (err) {
  console.error('Query error:', err);
} finally {
  kernel.close();
}
