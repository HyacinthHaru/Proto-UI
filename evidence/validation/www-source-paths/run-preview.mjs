import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
const [rootArg, outputArg] = process.argv.slice(2);
if (!rootArg || !outputArg) throw new Error('Usage: run-preview.mjs SOURCE_ROOT OUTPUT_DIR');
const root = path.resolve(rootArg);
const output = path.resolve(outputArg);
fs.mkdirSync(output, { recursive: true });
const probe = path.join(path.dirname(fileURLToPath(import.meta.url)), 'probe-built-preview.mjs');
const port = await new Promise((resolve, reject) => {
  const server = createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    server.close((error) => (error ? reject(error) : resolve(address.port)));
  });
});
const command = process.platform === 'win32' ? 'corepack.cmd' : 'corepack';
const server = spawn(
  command,
  [
    'pnpm@10.32.1',
    '--filter',
    'apps-www',
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--strictPort',
  ],
  {
    cwd: root,
    shell: process.platform === 'win32',
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  }
);
const log = fs.createWriteStream(path.join(output, 'preview-server.log'));
server.stdout.pipe(log, { end: false });
server.stderr.pipe(log, { end: false });
let exitCode = 1;
try {
  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 120_000;
  let ready = false;
  while (Date.now() < deadline) {
    if (server.exitCode !== null)
      throw new Error(`Preview exited before readiness: ${server.exitCode}`);
    try {
      if (
        (
          await fetch(`${base}/en/ui-libraries/base/dialog/`, {
            signal: AbortSignal.timeout(2_000),
          })
        ).ok
      ) {
        ready = true;
        break;
      }
    } catch {
      /* Wait for server readiness, not product hydration. */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready) throw new Error('Production preview did not become ready.');
  exitCode = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [probe, root, base, output], {
      cwd: root,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
} finally {
  fs.writeFileSync(
    path.join(output, 'probe-exit.json'),
    `${JSON.stringify({ exitCode }, null, 2)}\n`
  );
  if (server.pid && server.exitCode === null) {
    if (process.platform === 'win32') {
      await new Promise((resolve) => {
        const killer = spawn('taskkill', ['/PID', String(server.pid), '/T', '/F']);
        killer.once('error', resolve);
        killer.once('exit', resolve);
      });
    } else {
      try {
        process.kill(-server.pid, 'SIGTERM');
      } catch {
        /* Already exited. */
      }
    }
  }
  log.end();
}
process.exitCode = exitCode;
