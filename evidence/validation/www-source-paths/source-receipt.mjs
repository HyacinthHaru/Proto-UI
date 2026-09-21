import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const [rootArg, output] = process.argv.slice(2);
if (!rootArg || !output) throw new Error('Usage: source-receipt.mjs SOURCE_ROOT OUTPUT_JSON');
const root = path.resolve(rootArg);
const git = (...args) => execFileSync('git', args, { cwd: root });
const files = [
  'apps/www/astro.config.mjs',
  'pnpm-lock.yaml',
  'packages/core/src/internal.ts',
  'packages/core/src/prototype.ts',
  'packages/runtime/src/instance/instance.ts',
];
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const inputs = files.map((file) => {
  const bytes = fs.readFileSync(path.join(root, file));
  const committed = git('show', `HEAD:${file}`);
  const lf = Buffer.from(bytes.toString('utf8').replaceAll('\r\n', '\n'));
  if (!lf.equals(committed))
    throw new Error(`Working source does not match committed LF source: ${file}`);
  return {
    path: file,
    gitBlob: git('rev-parse', `HEAD:${file}`).toString().trim(),
    nativeSha256: sha256(bytes),
    committedSha256: sha256(committed),
    nativeBytes: bytes.length,
    committedBytes: committed.length,
    lfNormalizedExactlyMatches: true,
  };
});
const result = {
  observedAt: new Date().toISOString(),
  head: git('rev-parse', 'HEAD').toString().trim(),
  tree: git('rev-parse', 'HEAD^{tree}').toString().trim(),
  status: git('status', '--short').toString(),
  workingTreeDiff: git('diff', '--no-ext-diff').toString(),
  platform: process.platform,
  node: process.version,
  separator: path.sep,
  inputs,
};
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(
  JSON.stringify({
    head: result.head,
    platform: result.platform,
    node: result.node,
    inputs: inputs.length,
  })
);
