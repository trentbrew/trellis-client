#!/usr/bin/env bun

/**
 * Response logger - logs Cascade responses for compliance
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

const LOG_FILE = `${import.meta.dirname}/../logs/cascade-responses.log`;

async function main() {
  const input = await Bun.stdin.text();
  
  let data: HookInput;
  try {
    data = JSON.parse(input);
  } catch (err) {
    console.error("[RESPONSE] Failed to parse input:", err);
    process.exit(1);
  }

  const response = data.tool_info.response;
  const wordCount = response.split(/\s+/).length;
  const lineCount = response.split("\n").length;

  // Ensure log directory exists
  const dir = LOG_FILE.replace("/cascade-responses.log", "");
  await Bun.write(`${dir}/.gitkeep`, "");

  // Append to log
  const entry = `
${"=".repeat(80)}
Timestamp: ${data.timestamp}
Trajectory: ${data.trajectory_id}
Execution: ${data.execution_id}
Stats: ${wordCount} words, ${lineCount} lines
${"-".repeat(80)}
${response.substring(0, 500)}${response.length > 500 ? "..." : ""}
`;

  const existing = await Bun.file(LOG_FILE).text().catch(() => "");
  await Bun.write(LOG_FILE, existing + entry);

  console.log(`[RESPONSE] Logged response (${wordCount} words)`);
  process.exit(0);
}

main();
