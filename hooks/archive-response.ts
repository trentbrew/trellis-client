#!/usr/bin/env bun

/**
 * Response archiver - saves every Cascade response to a dated markdown file
 */

interface ResponseToolInfo {
  response: string;
}

interface HookInput {
  agent_action_name: string;
  tool_info: ResponseToolInfo;
  trajectory_id: string;
  execution_id: string;
  timestamp: string;
}

const ARCHIVE_DIR = `${import.meta.dirname}/../cascade-archive`;

async function main() {
  const input = await Bun.stdin.text();
  
  let data: HookInput;
  try {
    data = JSON.parse(input);
  } catch (err) {
    console.error("[ARCHIVER] Failed to parse input:", err);
    process.exit(1);
  }

  const date = new Date(data.timestamp);
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  
  const fileName = `${dateStr}_${timeStr}_${data.execution_id.slice(0, 8)}.md`;
  const filePath = `${ARCHIVE_DIR}/${fileName}`;

  // Create archive directory
  await Bun.write(`${ARCHIVE_DIR}/.gitkeep`, "");

  // Build markdown content
  const content = `---
trajectory_id: ${data.trajectory_id}
execution_id: ${data.execution_id}
timestamp: ${data.timestamp}
date: ${dateStr}
time: ${timeStr}
---

# Cascade Response

${data.tool_info.response}
`;

  await Bun.write(filePath, content);

  console.log(`[ARCHIVER] Response saved: cascade-archive/${fileName}`);
  console.log(`  → Trajectory: ${data.trajectory_id}`);
  process.exit(0);
}

main();
