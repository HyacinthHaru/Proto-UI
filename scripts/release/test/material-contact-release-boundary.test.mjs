import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { getPublicPackages, ROOT_DIR } from '../../build/public-packages.mjs';
import { getAllPackages, selectPackages, topoSortPackages } from '../lib.mjs';
import { collectLaunchGovernanceDiagnostics, loadLaunchPackageGovernance } from '../governance.mjs';

const name = '@proto.ui/module-material-contact';
const relDir = 'packages/modules/material-contact';
const manifest = JSON.parse(readFileSync(join(ROOT_DIR, relDir, 'package.json'), 'utf8'));
const packages = getAllPackages();
const material = packages.find((pkg) => pkg.name === name);

test('experimental Material Contact remains private and explicitly release-excluded', () => {
  assert.equal(manifest.private, true);
  assert.equal(manifest.protoUi?.release?.scan, false);
  assert.equal(manifest.publishConfig, undefined);
  assert.equal(manifest.scripts, undefined);
  assert.ok(material, 'the package remains visible in the workspace inventory');
  assert.equal(material.isReleaseExcluded, true);
});

test('workspace release selection never stages Material Contact, even with explicit selectors', () => {
  for (const options of [
    {},
    { includeLegacy: true, includeTest: true },
    { only: [name] },
    { only: [relDir] },
  ]) {
    assert.ok(
      !topoSortPackages(selectPackages(packages, options)).some((pkg) => pkg.name === name)
    );
  }
  const selected = selectPackages(packages);
  for (const publicName of ['@proto.ui/core', '@proto.ui/runtime', '@proto.ui/module-feedback']) {
    assert.ok(
      selected.some((pkg) => pkg.name === publicName),
      publicName
    );
  }
});

test('public build and selected release dependency closures do not consume the private module', () => {
  const publicPackages = getPublicPackages();
  assert.ok(!publicPackages.some((pkg) => pkg.name === name));
  for (const pkg of publicPackages) {
    assert.ok(!pkg.dependencyNames.includes(name), `${pkg.name} declares a private dependency`);
    assert.ok(!pkg.buildDeps.includes(name), `${pkg.name} builds the private module`);
  }
  for (const pkg of selectPackages(packages)) {
    assert.ok(!pkg.internalDeps.includes(name), `${pkg.name} requires the excluded module`);
  }
});

test('launch governance keeps Material Contact outside public admission', () => {
  const governance = loadLaunchPackageGovernance();
  const diagnostics = collectLaunchGovernanceDiagnostics(packages, governance);
  assert.ok(!diagnostics.unclassifiedWorkspacePackages.includes(name));
  for (const includeApprovedCandidates of [false, true]) {
    assert.ok(
      !selectPackages(packages, {
        profile: 'launch',
        launchGovernance: governance,
        includeApprovedCandidates,
      }).some((pkg) => pkg.name === name)
    );
  }
});

test('the real scan command preserves release issue checks without selecting the internal module', () => {
  const scan = spawnSync(process.execPath, ['scripts/release/scan.mjs', '--json'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });
  assert.equal(scan.status, 0, scan.stderr);
  const data = JSON.parse(scan.stdout);
  assert.ok(!data.selected.some((pkg) => pkg.name === name));
  // This is the same per-issue allowance used by General CI; it does not drop
  // whole mixed-diagnostic rows or bypass private/license failures.
  const offenders = data.selected.flatMap((pkg) =>
    pkg.issues
      .filter((issue) => !/^workspace deps:/.test(issue))
      .map((issue) => `${pkg.name}: ${issue}`)
  );
  assert.deepEqual(offenders, []);
});
