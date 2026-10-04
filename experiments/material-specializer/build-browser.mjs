import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import button from './button.proto.ts';
import { compileMaterialDeclarations } from './compile.mjs';
const out = resolve(process.argv[2] || '/tmp/pui-material-browser');
await mkdir(out, { recursive: true });
const result = compileMaterialDeclarations(button.modules, 'webgl-es100');
if (result.kind !== 'generated') throw new Error(JSON.stringify(result.diagnostics));
for (const [name, content] of Object.entries(result.files))
  await writeFile(resolve(out, name), content);
await build({
  entryPoints: ['experiments/material-specializer/browser-entry.ts'],
  outfile: resolve(out, 'app.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  tsconfig: 'tsconfig.json',
  plugins: [
    {
      name: 'fixed-material-program',
      setup(build) {
        build.onResolve({ filter: /^material-program$/ }, () => ({
          path: 'fixed-program',
          namespace: 'material',
        }));
        build.onLoad({ filter: /.*/, namespace: 'material' }, () => ({
          loader: 'js',
          contents: `${result.files['uniforms.mjs']}\nexport default {vertex:${JSON.stringify(result.files['lens.vert'])},fragment:${JSON.stringify(result.files['lens.frag'])},uniforms:${JSON.stringify(result.uniformABI)},writeFrame};`,
        }));
      },
    },
  ],
});
execFileSync(
  process.execPath,
  [
    'packages/cli/bin/proto-ui.js',
    'tokens',
    '--input',
    'experiments/material-specializer',
    '--out',
    resolve(out, 'tokens.css'),
  ],
  { stdio: 'inherit' }
);
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
await writeFile(
  resolve(out, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>Prototype owned-texture material</title><link rel="stylesheet" href="tokens.css"><style>
:root{font-family:system-ui;color:#171b24;background:#f5f6fa;--pui-foreground:rgb(0,0,0);--pui-ring:#275ef5;--pui-background:#f5f6fa}body{margin:32px}h1{font-size:24px}p{max-width:800px;line-height:1.5}#scene{position:relative;width:800px;height:480px;border-radius:16px;overflow:hidden}#backdrop{position:absolute;inset:0;width:800px;height:480px}#glass{position:absolute!important;left:310px;top:216px;min-width:180px;min-height:48px}footer{font-size:12px;margin-top:18px;color:#4b5362}
</style><h1>Prototype → Feedback → owned-texture host</h1><p>Real Base Button input. Original fixed liquidGL kernel; scene pixels belong to this isolated test. No DOM capture. Activations: <b id="count">0</b>.</p><section id="scene"><canvas id="backdrop" aria-hidden="true"></canvas></section><footer>Source ${revision}. Private experimental profile; no native/Vulkan parity claim.</footer><script type="module" src="app.js"></script>`
);
await writeFile(
  resolve(out, 'source.json'),
  JSON.stringify(
    {
      revision,
      shader: '88f681ab7035fd55b04f63edff1841e32c4199e9',
      execution: 'pending-browser-evidence',
    },
    null,
    2
  )
);
console.log(out);
