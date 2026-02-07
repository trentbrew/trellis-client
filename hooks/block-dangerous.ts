#!/usr/bin/env bun

/**
 * Security hook - blocks dangerous shell commands
 */

interface CommandToolInfo {
  command_line: string;
  cwd: string;
}

interface HookInput {
  agent_action_name: string;
  tool_info: CommandToolInfo;
  trajectory_id: string;
  execution_id: string;
  timestamp: string;
}

const DANGEROUS_PATTERNS = [
  { pattern: /rm\s+-rf\s+\//, reason: "System-wide delete detected" },
  { pattern: /sudo\s+rm/, reason: "Elevated delete command" },
  { pattern: /:(){ :|:& };:/, reason: "Fork bomb detected" },
  { pattern: /mkfs\./, reason: "Filesystem formatting detected" },
  { pattern: /dd\s+if=.+of=\/dev\//, reason: "Direct device write detected" },
  { pattern: /\>\s*\/dev\/null.*rm/, reason: "Suspicious redirect with delete" },
  { pattern: /(?:^|[|;&]\s*)python3?\s+-c\b/, reason: "Inline python execution blocked — use project tools (bun, TQL CLI) instead" },
  { pattern: /(?:^|[|;&]\s*)python3?\s+<<\s*/, reason: "Python heredoc execution blocked — use project tools (bun, TQL CLI) instead" },
  { pattern: /(?:^|[|;&]\s*)python3?\s+-\s*</, reason: "Python stdin execution blocked — use project tools (bun, TQL CLI) instead" },
  { pattern: /(?:^|[|;&]\s*)python3?\s+<\(/, reason: "Python process substitution blocked — use project tools (bun, TQL CLI) instead" },
];

async function main() {
  const input = await Bun.stdin.text();

  let data: HookInput;
  try {
    data = JSON.parse(input);
  } catch (err) {
    console.error("[BLOCKER] Failed to parse input:", err);
    process.exit(1);
  }

  const command = data.tool_info.command_line;

  console.log(`[BLOCKER] Checking command: ${command}`);

  for (const { pattern, reason } of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      console.error(`[BLOCKED] ${reason}: "${command}"`);
      process.exit(2); // Exit code 2 blocks the action
    }
  }

  console.log(`[BLOCKER] Command approved: ${command}`);
  process.exit(0);
}

main();
