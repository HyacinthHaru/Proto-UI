# Historical executed command shapes

This is a readable transcription of executed commands with machine paths replaced. It is not a new runner receipt. SOURCE_ROOT is the subject checkout, EVIDENCE_ROOT the original private output directory; Node24.21.0 and Chrome155.0.8059.39 executable paths are intentionally omitted. Published scripts have the same earlier public-path sanitization recorded by source-map.json and may need caller output-path substitution before reuse.

## Unit evidence

The actual five selected files were:

- apps/www/src/components/site-header-select-lifecycle.test.ts
- apps/www/src/components/site-header-disclosure.test.ts
- apps/www/src/components/PrototypePreviewer/select-public-parts.test.ts
- packages/prototypes/base/test/select.test.ts
- packages/prototypes/base/test/select-pointer-owner.test.ts

Baseline and repaired: `corepack pnpm@10.32.1 exec vitest run <those five paths> --maxWorkers=2 --minWorkers=1 --reporter=default --reporter=json --outputFile=<baseline.json or repaired.json>` with stdout/stderr redirected to the matching log. Exact selected file/case results remain in the existing runner JSONs.

Fixture-only control: `corepack pnpm@10.32.1 exec vitest run apps/www/src/components/site-header-select-lifecycle.test.ts --maxWorkers=1 --minWorkers=1`, redirected to fixture-control.log. **That command did not request JSON output. No original fixture-control runner JSON exists; none is fabricated for this transfer.** The actual8-pass/1-fail output is in the original log.

## Production and native evidence

`corepack pnpm@10.32.1 docs:build` produced the candidate655-page site. Root-only revert was separately rebuilt through the same command. The original complete candidate site was preserved before the control build and restored byte-for-byte for the final probe; this was not a third rebuild.

A Python ThreadingHTTPServer with request_queue_size128 served the complete current dist at127.0.0.1:51480. Browser probes were serial. The Header native inputs were real click, ArrowDown and Escape; the repeated-open operation intentionally invokes the public Root API.

- Candidate: `CHROME_PATH=<pinned binary> node native-repeat-executed.cjs` → native.log. This initial script has its original output destination expressed as the previously sanitized EVIDENCE_ROOT placeholder.
- Sole-Root control: `CHROME_PATH=<same binary> node native-repeat.cjs <native-control output>` → native-control.log.
- Restored candidate: `CHROME_PATH=<same binary> node native-repeat.cjs <native-restored output>` → native-restored.log.

The latter script adds only a caller output argument. Both actual executed source versions are included; they are not claimed byte-identical to one another. The source-map public hashes pin each derivative. Baseline uses only original d850 Root in otherwise984 product source; it is not whole-d850 acceptance. These observations do not certify6202, other Adapters, compiled consumers or full CI.
