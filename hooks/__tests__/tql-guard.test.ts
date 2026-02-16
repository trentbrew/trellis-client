import { describe, it, expect } from 'bun:test';
import { checkPatternRules, checkServiceRules } from '../tql-guard.js';

function makeInput(event: string, toolInfo: Record<string, any> = {}) {
  return {
    agent_action_name: event,
    tool_info: toolInfo,
    trajectory_id: 'test-traj',
    execution_id: 'test-exec',
    timestamp: new Date().toISOString(),
  };
}

describe('checkPatternRules', () => {
  describe('pre_run_command — dangerous commands', () => {
    it('blocks rm -rf /', () => {
      const result = checkPatternRules(makeInput('pre_run_command', { command: 'rm -rf /' }));
      expect(result).not.toBeNull();
      expect(result).toContain('Blocked dangerous command');
    });

    it('blocks rm -fr ~', () => {
      const result = checkPatternRules(makeInput('pre_run_command', { command: 'rm -fr ~' }));
      expect(result).not.toBeNull();
    });

    it('blocks DROP TABLE', () => {
      const result = checkPatternRules(makeInput('pre_run_command', { command: 'psql -c "DROP TABLE users"' }));
      expect(result).not.toBeNull();
    });

    it('blocks TRUNCATE TABLE', () => {
      const result = checkPatternRules(makeInput('pre_run_command', { command: 'TRUNCATE TABLE sessions' }));
      expect(result).not.toBeNull();
    });

    it('blocks chmod 777', () => {
      const result = checkPatternRules(makeInput('pre_run_command', { command: 'chmod 777 /etc/passwd' }));
      expect(result).not.toBeNull();
    });

    it('blocks git push --force', () => {
      const result = checkPatternRules(makeInput('pre_run_command', { command: 'git push origin main --force' }));
      expect(result).not.toBeNull();
    });

    it('blocks dd if=', () => {
      const result = checkPatternRules(makeInput('pre_run_command', { command: 'dd if=/dev/zero of=/dev/sda' }));
      expect(result).not.toBeNull();
    });

    it('blocks inline python', () => {
      const result = checkPatternRules(makeInput('pre_run_command', { command: 'python3 -c "import os; os.system(\'rm -rf /\')"' }));
      expect(result).not.toBeNull();
    });

    it('allows safe commands', () => {
      expect(checkPatternRules(makeInput('pre_run_command', { command: 'bun test' }))).toBeNull();
      expect(checkPatternRules(makeInput('pre_run_command', { command: 'pnpm lint' }))).toBeNull();
      expect(checkPatternRules(makeInput('pre_run_command', { command: 'ls -la' }))).toBeNull();
      expect(checkPatternRules(makeInput('pre_run_command', { command: 'git status' }))).toBeNull();
      expect(checkPatternRules(makeInput('pre_run_command', { command: 'cat package.json' }))).toBeNull();
    });

    it('allows safe exceptions for build cache cleanup', () => {
      expect(checkPatternRules(makeInput('pre_run_command', { command: 'rm -rf /path/to/apps/web/.nuxt' }))).toBeNull();
      expect(checkPatternRules(makeInput('pre_run_command', { command: 'rm -rf /path/to/.output' }))).toBeNull();
      expect(checkPatternRules(makeInput('pre_run_command', { command: 'rm -rf /path/to/node_modules/.vite' }))).toBeNull();
      expect(checkPatternRules(makeInput('pre_run_command', { command: 'rm -rf /path/to/.data/trellis.db' }))).toBeNull();
    });

    it('reads command from command_line fallback', () => {
      const result = checkPatternRules(makeInput('pre_run_command', { command_line: 'rm -rf /' }));
      expect(result).not.toBeNull();
    });
  });

  describe('pre_write_code — sensitive paths', () => {
    it('blocks writes to secrets/', () => {
      const result = checkPatternRules(makeInput('pre_write_code', { file_path: '/app/secrets/key.pem' }));
      expect(result).not.toBeNull();
    });

    it('blocks writes to .ssh/', () => {
      const result = checkPatternRules(makeInput('pre_write_code', { file_path: '/home/user/.ssh/id_rsa' }));
      expect(result).not.toBeNull();
    });

    it('blocks writes to .pem files', () => {
      const result = checkPatternRules(makeInput('pre_write_code', { file_path: '/certs/server.pem' }));
      expect(result).not.toBeNull();
    });
  });

  describe('pre_write_code — frozen paths', () => {
    it('blocks writes to node_modules/', () => {
      const result = checkPatternRules(makeInput('pre_write_code', { file_path: 'node_modules/foo/index.js' }));
      expect(result).not.toBeNull();
      expect(result).toContain('frozen');
    });

    it('blocks writes to .git/', () => {
      const result = checkPatternRules(makeInput('pre_write_code', { file_path: '.git/config' }));
      expect(result).not.toBeNull();
    });

    it('blocks writes to bun.lock', () => {
      const result = checkPatternRules(makeInput('pre_write_code', { file_path: '/app/bun.lock' }));
      expect(result).not.toBeNull();
    });

    it('allows writes to normal files', () => {
      expect(checkPatternRules(makeInput('pre_write_code', { file_path: '/app/src/main.ts' }))).toBeNull();
      expect(checkPatternRules(makeInput('pre_write_code', { file_path: '/app/hooks/tql-heal.ts' }))).toBeNull();
    });
  });

  describe('other events', () => {
    it('passes through non-guarded events', () => {
      expect(checkPatternRules(makeInput('pre_user_prompt', { prompt: 'rm -rf /' }))).toBeNull();
      expect(checkPatternRules(makeInput('post_cascade_response', {}))).toBeNull();
    });
  });
});

describe('checkServiceRules', () => {
  const services = [
    {
      '@id': 'svc:nuxt',
      '@type': 'Service',
      title: 'Nuxt Dev Server',
      port: 4141,
      url: 'http://localhost:4141',
      startCommand: 'nuxt dev',
      cwd: '/app',
      userManaged: true,
    },
    {
      '@id': 'svc:api',
      '@type': 'Service',
      title: 'API Server',
      port: 3000,
      startCommand: 'bun run serve',
      userManaged: false, // not user-managed
    },
  ];

  it('blocks starting a user-managed service', () => {
    const result = checkServiceRules('nuxt dev', services);
    expect(result).not.toBeNull();
    expect(result).toContain('user-managed');
    expect(result).toContain('Nuxt Dev Server');
  });

  it('blocks cd + startCommand pattern', () => {
    const result = checkServiceRules('cd /app && nuxt dev', services);
    expect(result).not.toBeNull();
  });

  it('allows non-managed services', () => {
    const result = checkServiceRules('bun run serve', services);
    expect(result).toBeNull();
  });

  it('allows unrelated commands', () => {
    expect(checkServiceRules('bun test', services)).toBeNull();
    expect(checkServiceRules('pnpm lint', services)).toBeNull();
  });

  it('returns null for empty services list', () => {
    expect(checkServiceRules('nuxt dev', [])).toBeNull();
  });
});
