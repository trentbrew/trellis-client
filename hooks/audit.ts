#!/usr/bin/env bun

/**
 * Audit hook - logs code changes with git-style diff summary
 */

interface Edit {
  old_string: string;
  new_string: string;
}

interface WriteToolInfo {
  file_path: string;
  edits: Edit[];
}

interface HookInput {
  agent_action_name: string;
  tool_info: WriteToolInfo;
  trajectory_id: string;
  execution_id: string;
  timestamp: string;
}

async function main() {
  const input = await Bun.stdin.text();
  
  let data: HookInput;
  try {
    data = JSON.parse(input);
  } catch (err) {
    console.error("Failed to parse JSON:", err);
    process.exit(1);
  }

  if (data.agent_action_name !== "post_write_code") {
    console.log("[AUDIT] Skipping non-write action");
    process.exit(0);
  }

  const { file_path, edits } = data.tool_info;
  
  // Calculate diff stats
  let linesAdded = 0;
  let linesRemoved = 0;
  
  for (const edit of edits) {
    linesRemoved += edit.old_string.split("\n").length;
    linesAdded += edit.new_string.split("\n").length;
  }

  console.log(`[AUDIT] Code modified: ${file_path}`);
  console.log(`  → ${edits.length} edit(s), +${linesAdded}/-${linesRemoved} lines`);
  console.log(`  → ${new Date(data.timestamp).toLocaleTimeString()}`);

  process.exit(0);
}

main();
