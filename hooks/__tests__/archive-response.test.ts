import { describe, it, expect } from 'bun:test';
import {
  extractActions,
  extractDecisions,
  extractSections,
  extractArtifacts,
  extractVerification,
} from '../archive-response.js';

describe('extractActions', () => {
  it('detects file reads', () => {
    const text = '*Viewed file:///Users/trent/app/config/routes.ts*';
    const actions = extractActions(text);
    expect(actions).toHaveLength(1);
    expect(actions[0]!['@type']).toBe('tql:FileRead');
    expect(actions[0]!['tql:path']).toBe('Users/trent/app/config/routes.ts');
  });

  it('detects file edits', () => {
    const text = '*Edited relevant file* and then *Edited file*';
    const actions = extractActions(text);
    expect(actions).toHaveLength(2);
    expect(actions.every((a) => a['@type'] === 'tql:FileEdit')).toBe(true);
  });

  it('detects code search', () => {
    const text = '*Grep searched codebase*';
    const actions = extractActions(text);
    expect(actions).toHaveLength(1);
    expect(actions[0]!['@type']).toBe('tql:CodeSearch');
  });

  it('detects searched filesystem variant', () => {
    const text = '*Searched filesystem*';
    const actions = extractActions(text);
    expect(actions).toHaveLength(1);
    expect(actions[0]!['@type']).toBe('tql:CodeSearch');
  });

  it('detects MCP tool runs', () => {
    const text = '*Running MCP tool*';
    const actions = extractActions(text);
    expect(actions).toHaveLength(1);
    expect(actions[0]!['@type']).toBe('tql:MCPToolRun');
  });

  it('detects command runs with command text', () => {
    const text = '*User accepted the command `bun test`*';
    const actions = extractActions(text);
    expect(actions).toHaveLength(1);
    expect(actions[0]!['@type']).toBe('tql:CommandRun');
    expect(actions[0]!['tql:command']).toBe('bun test');
  });

  it('detects browser preview', () => {
    const text = '*Ran preview*';
    const actions = extractActions(text);
    expect(actions).toHaveLength(1);
    expect(actions[0]!['@type']).toBe('tql:BrowserPreview');
  });

  it('detects todo updates', () => {
    const text = '*Updated todo list*';
    const actions = extractActions(text);
    expect(actions).toHaveLength(1);
    expect(actions[0]!['@type']).toBe('tql:TodoUpdate');
  });

  it('returns empty array for plain text', () => {
    expect(extractActions('just some regular text with no markers')).toEqual([]);
  });

  it('detects multiple mixed actions', () => {
    const text = [
      '*Viewed file:///Users/trent/app/main.ts*',
      '*Edited relevant file*',
      '*Grep searched codebase*',
      '*User accepted the command `pnpm lint`*',
    ].join('\n');
    const actions = extractActions(text);
    expect(actions).toHaveLength(4);
    const types = actions.map((a) => a['@type']);
    expect(types).toContain('tql:FileRead');
    expect(types).toContain('tql:FileEdit');
    expect(types).toContain('tql:CodeSearch');
    expect(types).toContain('tql:CommandRun');
  });
});

describe('extractDecisions', () => {
  it('detects "chose" pattern', () => {
    const text = 'I chose to use the existing pipeline because it already resolves dependencies.';
    const decisions = extractDecisions(text);
    expect(decisions.length).toBeGreaterThanOrEqual(1);
    expect(decisions.some((d) => d['tql:description'].includes('chose'))).toBe(true);
  });

  it('detects "because" pattern', () => {
    const text = 'because the current implementation handles edge cases correctly and is well tested.';
    const decisions = extractDecisions(text);
    expect(decisions.length).toBeGreaterThanOrEqual(1);
  });

  it('detects "instead of" pattern', () => {
    const text = 'instead of creating a new file we refactored the existing component to support both modes.';
    const decisions = extractDecisions(text);
    expect(decisions.length).toBeGreaterThanOrEqual(1);
  });

  it('ignores short fragments', () => {
    const text = 'chose x.';
    const decisions = extractDecisions(text);
    expect(decisions).toEqual([]);
  });

  it('returns empty for text without decision language', () => {
    expect(extractDecisions('The file was updated successfully.')).toEqual([]);
  });
});

describe('extractSections', () => {
  it('splits on ### headings', () => {
    const text = '### First Section\nSome content.\n### Second Section\nMore content.';
    const sections = extractSections(text);
    expect(sections).toHaveLength(2);
    expect(sections[0]!['tql:heading']).toBe('First Section');
    expect(sections[1]!['tql:heading']).toBe('Second Section');
  });

  it('falls back to single section when no headings', () => {
    const text = 'Just plain text without any headings.';
    const sections = extractSections(text);
    expect(sections).toHaveLength(1);
    expect(sections[0]!['tql:heading']).toBe('Response');
  });

  it('extracts actions within each section', () => {
    const text = '### Setup\n*Viewed file:///a.ts*\n### Build\n*Edited relevant file*';
    const sections = extractSections(text);
    expect(sections[0]!['tql:actions']).toHaveLength(1);
    expect(sections[0]!['tql:actions'][0]!['@type']).toBe('tql:FileRead');
    expect(sections[1]!['tql:actions']).toHaveLength(1);
    expect(sections[1]!['tql:actions'][0]!['@type']).toBe('tql:FileEdit');
  });
});

describe('extractArtifacts', () => {
  it('extracts file:/// references', () => {
    const text = 'Viewed file:///Users/trent/app/config.ts and file:///Users/trent/app/routes.ts';
    const artifacts = extractArtifacts(text);
    const fileRefs = artifacts.filter((a) => a['@type'] === 'tql:FileReferenced');
    expect(fileRefs).toHaveLength(2);
  });

  it('deduplicates file references', () => {
    const text = 'file:///Users/trent/app/foo.ts and again file:///Users/trent/app/foo.ts';
    const artifacts = extractArtifacts(text);
    const fileRefs = artifacts.filter((a) => a['@type'] === 'tql:FileReferenced');
    expect(fileRefs).toHaveLength(1);
  });

  it('extracts bug fix mentions', () => {
    const text = 'Fixed the issue where the sidebar would not render correctly on mobile devices.';
    const artifacts = extractArtifacts(text);
    const bugFixes = artifacts.filter((a) => a['@type'] === 'tql:BugFixed');
    expect(bugFixes.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty for clean text', () => {
    expect(extractArtifacts('No files or bugs here.')).toEqual([]);
  });
});

describe('extractVerification', () => {
  it('extracts error count', () => {
    const v = extractVerification('0 errors, 0 warnings');
    expect(v['tql:consoleErrors']).toBe(0);
  });

  it('extracts warning count', () => {
    const v = extractVerification('0 errors, 3 warnings');
    expect(v['tql:consoleWarnings']).toBe(3);
  });

  it('detects browser tested', () => {
    const v = extractVerification('Verified in browser at localhost:4141');
    expect(v['tql:browserTested']).toBe(true);
  });

  it('detects preview keyword', () => {
    const v = extractVerification('The preview looked correct.');
    expect(v['tql:browserTested']).toBe(true);
  });

  it('has no browser flag for non-browser text', () => {
    const v = extractVerification('The file was saved.');
    expect(v['tql:browserTested']).toBeUndefined();
  });

  it('always includes @type', () => {
    const v = extractVerification('');
    expect(v['@type']).toBe('tql:VerificationResult');
  });
});
