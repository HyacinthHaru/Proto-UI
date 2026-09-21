import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const [sourceArg, outputArg] = process.argv.slice(2);
if (!sourceArg || !outputArg)
  throw new Error('Usage: snapshot-assets.mjs SOURCE_ROOT OUTPUT_DIRECTORY');
const sourceRoot = path.resolve(sourceArg);
const output = path.resolve(outputArg);
const dist = path.join(sourceRoot, 'apps/www/dist');
const assets = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(filename);
    else if (/\.(?:js|css)$/.test(entry.name)) {
      const relative = path.relative(dist, filename).replaceAll('\\', '/');
      const bytes = fs.readFileSync(filename);
      const target = path.join(output, 'assets', relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, bytes);
      assets.push({
        path: relative,
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      });
    }
  }
}
walk(dist);
assets.sort((left, right) => left.path.localeCompare(right.path));
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'assets.json'), `${JSON.stringify(assets, null, 2)}\n`);
console.log(JSON.stringify({ assets: assets.length, manifest: path.join(output, 'assets.json') }));
