// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { searchEvidenceDirectory, summarizePendingRequests } from './site-search-evidence';

const source = readFileSync(
  'apps/www/src/content/docs/zh-cn/site-search-commands.browser.test.ts',
  'utf8'
);

describe('Search cold-start evidence boundary', () => {
  it('uses the full CI artifact root without changing the original readiness gate', () => {
    expect(source).toMatch(
      /searchEvidenceDirectory\(\s*process\.env\.PROTO_UI_RUNTIME_EVIDENCE_DIR,\s*process\.env\.RUNNER_TEMP \?\? os\.tmpdir\(\)\s*\)/
    );
    const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
    expect(workflow).toContain('path: ${{ runner.temp }}/runtime-ci');
    expect(source).toContain(
      "await expect.poll(() => trigger.getAttribute('aria-disabled')).toBe('false');"
    );
    expect(source).toContain('{ timeout: 10_000 }');
    expect(source).toContain("command?.getAttribute('role') === 'button'");
    expect(source).toContain("command.getAttribute('aria-disabled') === 'false'");
    expect(source).toContain('connected: button.isConnected');
    expect(source).toContain("inertAncestor: button.closest('[inert]')");
    expect(source).toContain("viewPending: button.hasAttribute('data-pui-view-pending')");
    expect(source).toContain('await captureFailure(page);\n            throw error;');
  });
});

describe('Search evidence controls without a browser or socket', () => {
  it('puts full CI evidence under its uploaded root and keeps isolated fallback', () => {
    expect(searchEvidenceDirectory('/runner/runtime-ci', '/runner/temp')).toBe(
      '/runner/runtime-ci/search-commands'
    );
    expect(searchEvidenceDirectory(undefined, '/runner/temp')).toBe(
      '/runner/temp/homepage-evidence/search-commands'
    );
    expect(searchEvidenceDirectory(undefined, '/os-temp')).toBe(
      '/os-temp/homepage-evidence/search-commands'
    );
  });

  it('counts all pending requests by type while bounding samples and URL length', () => {
    const requests = Array.from({ length: 4000 }, (_, index) => ({
      type: index % 2 ? 'font' : 'script',
      url: `https://example.com/${'chunk-'.repeat(80)}${index}?token=excluded#fragment`,
    }));
    const summary = summarizePendingRequests(requests);
    expect(summary.pendingCount).toBe(4000);
    expect(summary.byType).toEqual({ script: 2000, font: 2000 });
    expect(summary.samples).toHaveLength(4);
    expect(summary.samples.every(({ url }) => url.length <= 180)).toBe(true);
    expect(JSON.stringify(summary)).not.toMatch(/token=|fragment/);
    expect(JSON.stringify(summary).length).toBeLessThan(1200);
  });

  it('counts concurrent identical URLs independently and reports the empty control', () => {
    const same = { type: 'script', url: 'https://example.com/same.js?query=1' };
    const pending = new Map([
      [{}, same],
      [{}, same],
    ]);
    expect(summarizePendingRequests(pending.values()).pendingCount).toBe(2);
    pending.delete(pending.keys().next().value!);
    expect(summarizePendingRequests(pending.values()).pendingCount).toBe(1);
    expect(summarizePendingRequests([])).toEqual({ pendingCount: 0, byType: {}, samples: [] });
    expect(
      summarizePendingRequests([{ type: 'other', url: '/relative?secret=1' }]).samples
    ).toEqual([{ type: 'other', url: '/relative' }]);
    expect(source).toContain('entry.pendingRequests.set(request,');
    expect(source).toContain('entry.pendingRequests.delete(request)');
  });

  it('retains failure and late owner summaries before screenshot work and rethrows the failure', () => {
    expect(source).toContain('stageElapsedMs:');
    expect(source).toContain('activeCommands: observed.commands.map');
    expect(source).toContain('lateObservation: entry?.lateObservation ?? null');
    expect(source).toContain(
      "state.startsWith('failure-') || state.startsWith('late-observation-')"
    );
    expect(source).toContain("entry.stage === 'initial-ready' || missingCommand === 0");
    expect(source.indexOf("console.info('[Search evidence]'")).toBeLessThan(
      source.indexOf('await page.screenshot(')
    );
    expect(source.indexOf('`${id}-${state}.json`')).toBeLessThan(
      source.indexOf('await page.screenshot(')
    );
    expect(source).toContain("sha: execFileSync('git', ['rev-parse', 'HEAD']");
  });
});
