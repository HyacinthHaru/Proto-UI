import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parse } from 'yaml';

test('diagram evidence uses an exact-head read-only PR job and a valid job-level environment', async () => {
  const workflow = parse(
    await readFile(
      new URL('../../../.github/workflows/whitepaper-diagram-evidence.yml', import.meta.url),
      'utf8'
    )
  );
  assert.deepEqual(Object.keys(workflow.on), ['pull_request']);
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  const job = workflow.jobs.capture;
  assert.equal(job.env.CANDIDATE_SHA, '${{ github.event.pull_request.head.sha }}');
  // runner is unavailable at jobs.<job_id>.env. Keep the fixed Linux path here;
  // runtime runner variables may only be resolved later inside a step.
  assert.equal(job.env.DIAGRAM_EVIDENCE_DIR, '/tmp/whitepaper-diagram-evidence');
  const checkout = job.steps.find((step) => step.uses?.startsWith('actions/checkout@'));
  assert.equal(checkout.with.ref, '${{ env.CANDIDATE_SHA }}');
  assert.equal(checkout.with['persist-credentials'], false);
  assert.ok(
    workflow.on.pull_request.paths.includes(
      'apps/www/scripts/whitepaper-diagram-evidence-profiles.mjs'
    )
  );
  for (const figure of ['switch-activation', 'evolution-feedback']) {
    assert.ok(
      job.steps.some((step) =>
        step.run?.includes(
          `DIAGRAM_EVIDENCE_FIGURE=${figure} node apps/www/scripts/capture-whitepaper-diagram-evidence.mjs`
        )
      )
    );
  }
  assert.ok(
    job.steps.some(
      (step) => step.uses?.startsWith('actions/upload-artifact@') && step.if === 'always()'
    )
  );
});

test('responsive evidence keeps the fallback locator but binds selected bytes, dimensions and fonts', async () => {
  const runner = await readFile(
    new URL('../../../apps/www/scripts/capture-whitepaper-diagram-evidence.mjs', import.meta.url),
    'utf8'
  );
  assert.ok(runner.includes('for (const selected of diagramVariants(profile, locale))'));
  assert.ok(runner.includes("fs.readFile(path.join(dist, selected.asset))"));
  assert.ok(runner.includes("fs.readFile(path.join(root, 'apps/www/public', selected.asset))"));
  assert.match(runner, /assert\.deepEqual\(bytes, authored,/);
  assert.ok(runner.includes("svgSha256: createHash('sha256').update(bytes).digest('hex')"));
  assert.ok(runner.includes("sourceSha256: createHash('sha256').update(authored).digest('hex')"));
  assert.ok(runner.includes('const image = page.locator(`img[src="${asset}"]`)'));
  assert.ok(runner.includes('src: node.currentSrc'));
  assert.ok(runner.includes('assert.equal(measurement.src, origin + expected.asset'));
  assert.ok(runner.includes('assert.equal(measurement.naturalWidth, expected.width)'));
  assert.ok(runner.includes('assert.equal(measurement.naturalHeight, expected.height)'));
  assert.ok(runner.includes('for (const selected of verified.values())'));
  assert.ok(runner.includes('await probe.goto(origin + selected.asset'));
  assert.ok(runner.includes('fontEntry.minimumFontSize >= 26'));
  assert.ok(runner.includes('fontProbe.minimumFontSize * measurement.width / expected.width'));
  assert.ok(runner.includes('measurement.minimumRenderedFontSize >= 16'));
  assert.ok(runner.includes('box.x + box.width <= box.card.x + box.card.width + 1'));
  assert.doesNotMatch(runner, /process\.env\.(?:DIAGRAM_EVIDENCE_ASSET|DIAGRAM_ASSET|ASSET_PATH)/);
});

test('responsive captures use the real article and Dialog through resize, repetition and history', async () => {
  const runner = await readFile(
    new URL('../../../apps/www/scripts/capture-whitepaper-diagram-evidence.mjs', import.meta.url),
    'utf8'
  );
  assert.ok(runner.includes('for (const capture of diagramEvidenceCases(profile))'));
  assert.ok(runner.includes('entry.beforeResize = await readArticle(before, initialViewport)'));
  assert.ok(runner.indexOf('await page.setViewportSize(viewport)') < runner.indexOf('entry.preview = await openPreview()'));
  assert.ok(runner.includes("page.locator('[data-docs-image-trigger]').filter({ has: image })"));
  assert.ok(runner.includes("page.locator('.docs-image-full')"));
  assert.ok(runner.includes('entry.preview = await openPreview()'));
  assert.ok(runner.includes("await page.keyboard.press('Escape')"));
  for (const phase of ['repeated-open-dismiss', 'after-back', 'after-forward-back']) {
    assert.ok(runner.includes(`await exerciseAgain('${phase}')`));
  }
  assert.ok(runner.includes("await page.goBack({ waitUntil: 'networkidle' })"));
  assert.ok(runner.includes("await page.goForward({ waitUntil: 'networkidle' })"));
  assert.ok(runner.includes("if (profile.figure === 'evolution-feedback') {\n            entry.interactions = []"));
  assert.ok(runner.includes("if (scenario === 'landscape-390')"));
  assert.ok(runner.includes('no 16 px minimum is promised'));
  for (const suffix of ['article', 'figure', 'preview']) {
    assert.ok(runner.includes('`${id}-' + suffix + '.png`'));
  }
  assert.ok(runner.includes('diagramEvidenceId(profile, locale, theme, viewport.width, revision, svgSha256, scenario)'));
  assert.ok(runner.includes('report.failures.push({ id, error: String(error) })'));
});
