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

test('evolution figure captures preserve the viewport and disclose complete document-region captures', async () => {
  const runner = await readFile(
    new URL('../../../apps/www/scripts/capture-whitepaper-diagram-evidence.mjs', import.meta.url),
    'utf8'
  );
  assert.ok(runner.includes("document.querySelectorAll('header, [role=\"banner\"], .header')"));
  assert.ok(runner.includes('const headerOverlap = headers.filter((header) => overlaps(image, header))'));
  assert.ok(runner.includes('fullyVisible: fullyInViewport && headerOverlap.length === 0'));
  assert.ok(runner.includes('image.height + topInset + 16 <= innerHeight'));
  assert.ok(runner.includes('measurement.visibleRegion = await image.evaluate(measureVisibleRegion)'));
  assert.ok(runner.includes("kind: 'viewport', file: filename, viewport, source: entry.image"));
  const capture = runner.slice(runner.indexOf('const originalRegion ='), runner.indexOf('// Exercise the actual enhanced page control'));
  assert.ok(capture.includes('const fullPage = !originalRegion.fitsUnobstructedViewport'));
  assert.ok(capture.includes("assert.ok(originalRegion.headers.length > 0, 'Measure the actual site header')"));
  assert.ok(capture.includes('assert.ok(positioned.headers.length > 0'));
  assert.ok(capture.includes("const kind = fullPage ? 'document-region' : 'viewport-region'"));
  assert.ok(capture.includes("`${id}-figure-${fullPage ? 'document' : 'viewport'}.png`"));
  assert.ok(capture.includes('region.documentImage.y - region.topInset - 8'));
  assert.ok(capture.includes('assert.ok(positioned.fullyVisible'));
  assert.ok(capture.includes('assert.deepEqual(positioned.scroll, { x: 0, y: 0 }'));
  assert.ok(capture.includes('assert.equal(positioned.headerOverlap.length, 0'));
  assert.ok(capture.includes('const bounds = fullPage ? positioned.documentImage : positioned.image'));
  assert.ok(capture.includes('Math.ceil(bounds.x + bounds.width) - Math.floor(bounds.x)'));
  assert.ok(capture.includes('Math.ceil(bounds.y + bounds.height) - Math.floor(bounds.y)'));
  assert.ok(capture.includes('clip.x + clip.width <= limit.width && clip.y + clip.height <= limit.height'));
  assert.ok(capture.includes('path: path.join(out, figureFile), fullPage, clip,'));
  assert.ok(capture.includes("scale: 'css', caret: 'initial', animations: 'allow'"));
  assert.ok(capture.includes('assert.deepEqual(page.viewportSize(), configuredViewport)'));
  assert.ok(capture.includes('assert.deepEqual(after.viewport, positioned.viewport)'));
  assert.ok(capture.includes('assert.deepEqual(after.scroll, positioned.scroll)'));
  assert.ok(capture.includes('assert.deepEqual(after.documentImage, positioned.documentImage)'));
  assert.ok(capture.includes('assert.deepEqual(dimensions, { width: clip.width, height: clip.height })'));
  assert.ok(capture.includes('entry.figureCapture.source = bindMeasurement(await image.evaluate(measureImage), selected)'));
  assert.ok(capture.includes("screenshotSha256: createHash('sha256').update(png).digest('hex')"));
  assert.ok(capture.includes("entry.figureCapture.outcome = 'failed'"));
  assert.ok(capture.includes('finally {'));
  assert.ok(capture.includes('originalRegion.scroll'));
  assert.ok(capture.indexOf('window.scrollTo({') < capture.indexOf('await page.screenshot({'));
  assert.doesNotMatch(capture, /setViewportSize|image\.screenshot|addStyleTag|\.style\b|style:|mask:|sharp\b|canvas\b/);
  // This is a source contract, not executed browser visibility evidence.
});
