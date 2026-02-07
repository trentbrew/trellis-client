#!/usr/bin/env bun

/**
 * Generic logging hook - logs all hook invocations to a file
 */

import { resolve } from "path";

interface HookInput {
  agent_action_name: string;
  trajectory_id: string;
  execution_id: string;
  timestamp: string;
  tool_info: Record<string, unknown>;
}

const LOG_FILE = resolve(import.meta.dir, "../logs/hook-activity.log");

async function main() {
  // Read JSON from stdin
  const input = await Bun.stdin.text();
  
  let data: HookInput;
  try {
    data = JSON.parse(input);
  } catch (err) {
    console.error("Failed to parse JSON input:", err);
    process.exit(1);
  }

  // Format the log entry
  const logEntry = {
    ...data,
    received_at: new Date().toISOString(),
  };

  // Ensure log directory exists
  await Bun.write(LOG_FILE, "", { createPath: true });
  
  // Append to log file
  const existing = await Bun.file(LOG_FILE).text();
  const newContent = existing + 
    "\n" + "=".repeat(80) + "\n" + 
    JSON.stringify(logEntry, null, 2) + "\n";
  
  await Bun.write(LOG_FILE, newContent);

  // Output to console (visible in Cascade UI if show_output: true)
  console.log(`[HOOK] ${data.agent_action_name} triggered`);
  console.log(`  → File: ${data.tool_info?.file_path ?? "N/A"}`);
  console.log(`  → Trajectory: ${data.trajectory_id}`);

  process.exit(0);
}

main();
