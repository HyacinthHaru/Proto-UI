# WC disconnect checkpoints and original browser shards

The author was asked to isolate the WC lifecycle work after a Brutalist family write, retain the original assertions and deadlines, and verify Contents, Dialog and Header placement. S4 startup had a separate transport and evaluation investigation.

## Product change and exact local controls

Main was `35195a6e`. The parent was `a7952f1c` and the signed product was `31ba38a9`. Only the WC Adapter and its lifecycle contract test changed. The original browser assertions, deadlines and all seven CodeExamples on the named Chinese Shadcn Button page stayed byte-identical.

The test removes a mounted element, reconnects it and removes it again before either disconnect checkpoint. It observes the element after the first checkpoint and before the second. The old checkpoint wrote the newest disconnect's pending `inline-flex` token back to the detached element. The new checkpoint validates owner and disconnect version before touching the current snapshot. Reconnect still applies the style synchronously. The latest checkpoint still owns Portal refresh and retirement.

The regression failed once on the parent with the candidate test and passed with 130 other focused tests on the candidate. A real Chrome 156 control independently observed synchronous style restoration, no write at the intermediate detached checkpoint and exactly one disposal.

The clean product and the generated static preview each passed the same 15 original selected cases, including Contents, mobile shell, all eight Dialog cases, compact and reconnect cases and the narrow RuntimeBox case. The local Contents run recorded eight original one-second checks and 24 ordered sidebar returns. Astro checked 1,215 files with zero errors, zero warnings and 30 hints. The production build emitted 673 pages. Its bundle checker still rejected with the same 53 complete diagnostics as main.

Trusted Homepage clicks switched to Brutalist at 320px and 390px. At mutation delivery and the next two animation frames the panel began at y=61px and the Header bottom was y=56px. The panel remained in the viewport. These diagnostic geometry reads can force layout. They were taken separately from the original hosted timing and locate layout at animation-frame callbacks. The three images show the inspected original run's narrow WC focus ring, 390px settled WC Dialog and 390px Brutalist React Contents Popover.

## Original hosted shards

Run [43446021544](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43446021544) used the original 1/8 and 3/8 suite lists. Each shard ran baseline then candidate on the same hosted runner with the same verified Chrome 157.0.8103.50 binary, Node 24.22.2 and runner image 20261111.196.1. The diagnostic carriers shared the browser overlay. Their workflow file also differed. The product diff was the two WC files. The archive hashes, runner data, tree identities, job links and original verdicts are in the receipt.

Both arms passed the named Contents and mobile shell cases, eight one-second runtime transitions and 24 ordered sidebar returns. Both also passed Dialog 8/8 and WC Shadow closeout 153/153. The candidate Contents React/Vue observations were 536/440ms for Shadcn and 560/614ms for Brutalist. The four original shard arms reached their 900-second limit and exited 124. Each arm pair had the same visible failing test names before the wrapper stopped it. The Chinese S4 predicate was red in both shard 1 arms and the English run entered startup without an observed terminal result.

Both original Brutalist reconnect polls rejected at +1,000ms. The actual family write finished at +1,144.337ms and +1,240.460ms, and the pending query returned to Node at +1,855.336ms and +1,942.353ms, respectively. From completed write to renderer command dispatch was 707.942ms and 698.367ms. The same renderer interval contained 386 disconnect microtask calls, 73 connection callbacks and 334 synchronous disconnect callbacks in each arm. The independent wall-time unions were 218.567/229.884ms, 130.491/146.471ms and 13.495/14.183ms. Nested intervals overlap. V8 stack samples put nearly all the checkpoint weight under `retireOwner` and connection weight under `_connectOwner`. The stale checkpoint fix is supported by its separate red/green mechanism test. This pair leaves the original hosted one-second failure open and establishes no performance gain.

## Separate S4 trace

In two original bilingual cases with passive network observation, NetLog recorded the complete 200 response bodies of both large optimized React dependencies, matching HTTP Content-Length and request close, 7–18ms after each request. Both locales timed out. Node observed entry-module response events about 9.48s after browser receipt in Chinese and 3.62s in English. No response or finish callback for the two chunks reached either recorded observer in those attempts.

The complete narrow V8 trace is a separate diagnostic run with NetLog, Network CDP and the original S4 cases. In the Chinese case, chunk bodies completed 4–5ms after requests. URL-bound renderer streaming completion was within 1.17ms and 4.75ms of receipt. The URL-bound compile events and Node response delivery were about 4.2s after receipt. The first React import Promise returned 71.549s after both bodies. The aggregate runtime continuation was another 21.5s later. The original case still failed. English showed complete receipt and renderer streaming, with no matching compile, CDP response delivery or React import return observed in its original case window.

The renderer's `v8.evaluateModule` events contain `worldId`. URL-bound compilation and observed Promise completions provide separate boundaries. The evaluation events provide no package identity for the intervening delay. Both early trace attempts were invalid controls because the diagnostic middleware's output variable was missing. Their 500 responses, timeouts and failed cold-cache control are recorded. The same patch with its complete environment reached React in both locales and preserved both original failure verdicts. The diagnostic patch was removed from the temporary checkout.

## Evidence scope

The local lifecycle regression, original selected consumer cases and geometry controls have bounded receipts. Evidence is partial for full hosted and S4 acceptance. Follow-up can separate actual owner retirement and activation from the pre-write work and bind the post-network wait to named S4 module and scheduler events. The raw NetLogs and Chrome traces stay local. This directory records derived timings, checksums, original verdicts and reviewed captures.
