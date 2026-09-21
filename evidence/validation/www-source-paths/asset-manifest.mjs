import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const [rootArg, output] = process.argv.slice(2);
if (!rootArg || !output) throw new Error('Usage: asset-manifest.mjs SOURCE_ROOT OUTPUT_JSON');
const root = path.join(path.resolve(rootArg), 'apps/www/dist');
const entries = [];
function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(file);
    else if (/\.(?:m?js|css)$/.test(entry.name)) {
      const bytes = fs.readFileSync(file);
      entries.push({
        path: path.relative(root, file).split(path.sep).join('/'),
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      });
    }
  }
}
visit(root);
entries.sort((a, b) => a.path.localeCompare(b.path));
fs.writeFileSync(output, `${JSON.stringify(entries, null, 2)}\n`);
console.log(`${entries.length} client JS/CSS assets recorded`);
