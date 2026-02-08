import { describe, it, expect } from 'bun:test';
import {
  matchesGlobs,
  extractManualSections,
  loadTrellis,
  buildDocument,
} from '../tql-docs-sync.js';
import { TrellisKernel } from '../../packages/tql/kernel/trellis-kernel.js';

// ── matchesGlobs ────────────────────────────────────────────────────────

describe('matchesGlobs', () => {
  it('matches a simple glob pattern', () => {
    expect(matchesGlobs('hooks/tql-guard.ts', ['hooks/*.ts'])).toBe(true);
  });

  it('matches a deep glob pattern', () => {
    expect(matchesGlobs('hooks/__tests__/guard.test.ts', ['hooks/**/*.ts'])).toBe(true);
  });

  it('rejects non-matching files', () => {
    expect(matchesGlobs('apps/web/page.vue', ['hooks/*.ts'])).toBe(false);
  });

  it('matches when any glob in the array matches', () => {
    expect(
      matchesGlobs('apps/web/app/types/entity.ts', [
        'hooks/*.ts',
        'apps/web/app/types/entity.ts',
      ]),
    ).toBe(true);
  });

  it('handles catch-all globs', () => {
    expect(matchesGlobs('any/random/file.md', ['**/*'])).toBe(true);
  });

  it('handles empty globs array', () => {
    expect(matchesGlobs('file.ts', [])).toBe(false);
  });
});

// ── extractManualSections ───────────────────────────────────────────────

describe('extractManualSections', () => {
  it('extracts manual content between markers', () => {
    const content = [
      '# Title',
      '',
      '## Overview',
      '',
      '<!-- manual:start -->',
      'This is my hand-written overview.',
      'It spans multiple lines.',
      '<!-- manual:end -->',
      '',
      '## Auto Section',
      '',
      'Some auto content.',
    ].join('\n');

    const manual = extractManualSections(content);
    expect(manual.size).toBe(1);
    expect(manual.get('Overview')).toBe(
      'This is my hand-written overview.\nIt spans multiple lines.',
    );
  });

  it('extracts multiple manual sections', () => {
    const content = [
      '## First',
      '<!-- manual:start -->',
      'Content A',
      '<!-- manual:end -->',
      '## Second',
      '<!-- manual:start -->',
      'Content B',
      '<!-- manual:end -->',
    ].join('\n');

    const manual = extractManualSections(content);
    expect(manual.size).toBe(2);
    expect(manual.get('First')).toBe('Content A');
    expect(manual.get('Second')).toBe('Content B');
  });

  it('returns empty map for content with no manual markers', () => {
    const content = '# Title\n\n## Section\n\nJust auto content.\n';
    const manual = extractManualSections(content);
    expect(manual.size).toBe(0);
  });

  it('returns empty map for empty string', () => {
    const manual = extractManualSections('');
    expect(manual.size).toBe(0);
  });
});

// ── loadTrellis ─────────────────────────────────────────────────────────

describe('loadTrellis', () => {
  it('loads active modules from the trellis file', () => {
    const modules = loadTrellis();
    expect(modules.length).toBeGreaterThan(0);
    for (const m of modules) {
      expect(m.status).toBe('active');
      expect(m.title).toBeTruthy();
      expect(m.outputPath).toBeTruthy();
      expect(Array.isArray(m.sections)).toBe(true);
    }
  });

  it('includes expected module IDs', () => {
    const modules = loadTrellis();
    const ids = modules.map((m) => m['@id']);
    expect(ids).toContain('doc:changelog');
    expect(ids).toContain('doc:tql-hooks');
    expect(ids).toContain('doc:entity-system');
  });
});

// ── buildDocument ───────────────────────────────────────────────────────

describe('buildDocument', () => {
  const stubModule = {
    '@id': 'doc:test',
    '@type': 'DocModule',
    title: 'Test Module',
    description: 'A test module for unit tests.',
    sourceGlobs: ['test/**'],
    outputPath: 'living-docs/TEST.md',
    status: 'active',
    sections: [
      { heading: 'Overview', mode: 'manual' as const },
      { heading: 'Auto Section', mode: 'auto' as const, template: 'conventions-list' },
    ],
  };

  it('generates a document with title and description', () => {
    const kernel = new TrellisKernel();
    const doc = buildDocument(stubModule, kernel, '');
    expect(doc).toContain('# Test Module');
    expect(doc).toContain('> A test module for unit tests.');
    kernel.close();
  });

  it('includes manual markers for manual sections', () => {
    const kernel = new TrellisKernel();
    const doc = buildDocument(stubModule, kernel, '');
    expect(doc).toContain('<!-- manual:start -->');
    expect(doc).toContain('<!-- manual:end -->');
    kernel.close();
  });

  it('preserves existing manual content on regeneration', () => {
    const kernel = new TrellisKernel();

    // First generation
    const doc1 = buildDocument(stubModule, kernel, '');
    expect(doc1).toContain('*Write your content here.');

    // Simulate user editing the manual section
    const edited = doc1.replace(
      '*Write your content here. This section is preserved across regenerations.*',
      'My custom overview content that should survive.',
    );

    // Second generation with edited content as "existing"
    const doc2 = buildDocument(stubModule, kernel, edited);
    expect(doc2).toContain('My custom overview content that should survive.');
    expect(doc2).not.toContain('*Write your content here.');

    kernel.close();
  });

  it('renders auto sections with template output', () => {
    const kernel = new TrellisKernel();
    const doc = buildDocument(stubModule, kernel, '');
    // The conventions-list template should produce something (even if empty state)
    expect(doc).toContain('## Auto Section');
    expect(doc).toContain('No conventions defined yet');
    kernel.close();
  });

  it('includes the auto-generated footer', () => {
    const kernel = new TrellisKernel();
    const doc = buildDocument(stubModule, kernel, '');
    expect(doc).toContain('Auto-generated by [TQL Living Docs]');
    kernel.close();
  });
});
