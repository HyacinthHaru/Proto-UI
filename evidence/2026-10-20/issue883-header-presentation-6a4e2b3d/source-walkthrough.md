# Source and causal walkthrough: Header and bounded diagnostics

This walkthrough is bound to commit [`6a4e2b3db65878da7b5150cdad49eb9d8a1cc9d0`](https://github.com/Proto-UI/Proto-UI/commit/6a4e2b3db65878da7b5150cdad49eb9d8a1cc9d0), tree `41adb1995907dde0fecd8a0bda72431aa952547f`. It explains observed execution and the bounded changes; it is not a new specification or formal approval. All local execution epochs remain those in the raw receipts. Current canonical status belongs to [README.md](README.md) and [packet.json](packet.json), not to an inference from the local positives below.

## Header consumer layout

The original private measurement extended the existing same-RPC computed-style sample without changing its geometry expectation: height38, minHeight36, lineHeight20, paddingTop8, paddingBottom8, border1+1, border-box and automatic height. The existing Header variable was present, but the full Shadcn parts did not receive that consumer padding.

The two source changes are an app-internal optional `paddingBlock` field, a conditional spread into the existing Surface style, and explicit values on the two Homepage preference controls:

- [composition configuration and Surface application](https://github.com/Proto-UI/Proto-UI/blob/6a4e2b3db65878da7b5150cdad49eb9d8a1cc9d0/apps/www/src/components/PrototypePreviewer/projection-composition.ts#L54)
- [Homepage Runtime and Family consumers](https://github.com/Proto-UI/Proto-UI/blob/6a4e2b3db65878da7b5150cdad49eb9d8a1cc9d0/apps/www/src/components/Homepage/homepage-runtime-client.ts#L433)

An unset configuration does not introduce generic padding. The no-padding default controls remain. The repair retains automatic height and the existing responsive 36/44 px oracle; it is not a fixed-height fallback or a component-specific compiler exception.

The first complete Header candidate run passed6/failed10. Eight Shadcn cases had progressed beyond the corrected desktop geometry before failing a transparent Content paint sample; two Brutalist React cases failed native-link ring sampling. After selecting the real painting Surface, a second complete run still passed6/failed10, now with eight later pressed-offset failures and the two link samples. These are different first divergences, not a single failure recounted twice.

## Painting owner and fixture readiness

The real private owner probe found a transparent positioning Content and one connected Surface with matching nonempty owner/generation, opaque background, opacity1 and the expected shadow. All four options belonged to that Surface chain. The paint helper now reads that real painting subject while retaining the Content's positioning/transition role and original color/contrast/shadow expectations. The earlier missing-identity guard finding and correction are preserved.

Two other fixture premises changed explicitly:

| Premise | Current authority/evidence | Bounded fixture change |
| --- | --- | --- |
| Shadcn pressed control moves +1 px | Draft `P-SHADCN-SELECT-TRIGGER`'s state-driven-styling criterion explicitly has no pressed displacement; existing tests/implementation agree. | Expect the same y coordinate; no Prototype or shared CSS change. |
| A completed native focus RPC implies the passive Surface ring is already painted | Actual trace had Props `focusVisible=true` and commit version10 enqueued, but no observed acknowledgement before the immediate failed sample. Active React profile separates notification from render commit. | Poll the same focused anchor and original `ring-2` condition before the unchanged snapshot/assertions; default1000 ms and original90 s case remain. |

The second row changes the sampling time. It does not prove when that earlier commit eventually completed, establish a browser-wide latency guarantee, or repair React's renderer. The full 16 cases subsequently passed without the private tapes, then passed again within the final136 combination.

## Preparing-close focus return

The unchanged original Vue2 Header **Node/Happy DOM fixture** supplied the actual negative. Its DOM focus spy observed the option active before Escape and no Trigger `focus()` call after Escape. This is a real installed Runtime/Adapter composition in Happy DOM, not a real-Chromium negative. The separately sourced Chromium16/136 positives are distinct evidence. Base branch observation in that fixture then recorded:

1. The close path owned the entry, with public phase `preparing`, full-pending alignment and Root closed by Escape.
2. The guard after Overlay close was current.
3. Explicit transition leave synchronously retired the presentation; `currentContext` became null.
4. The next current-presentation guard failed, so the existing late focus-return branch was never reached.

This is distinct from a host rejecting an actual post-Escape focus request. The [final close path](https://github.com/Proto-UI/Proto-UI/blob/6a4e2b3db65878da7b5150cdad49eb9d8a1cc9d0/packages/prototypes/base/src/select/content.proto.ts#L303) reuses the original focus eligibility and reason:

```text
cancel entry task → deactivate active entry → original current guard
  preparing only: try existing return-focus conditions
  preparing only: recheck current presentation after possible focus reentry
  original Overlay close → original guard → original transition leave
  original guards / applicable completion
  non-preparing only: existing late return-focus conditions
finally: rethrow the captured early focus error, if any
```

The guard protects a synchronous focus callback that reopens or otherwise replaces the presentation. The preparing path is early enough for an Overlay-bound leave that can itself retire synchronously. Entering/entered keep their old observable close/leave/late-focus order. This is a portable Base change, not a Vue2 special case.

Four WC reopen/error controls were already positive on the original Base. They are nonregression controls. An additional raw0 experiment failed before this fix and was withdrawn; no lower-level falsey exception policy is repaired or declared correct here. The initial attempted preparing append did not apply, so only two normal controls ran; the later four-control baseline is preserved separately. There was no source `.only` modifier.

## Post-verdict query drainage

The original family matcher, original query expression, 171 Homepage matchers and 17 keyboard-owner controls remain. The new budget belongs only to diagnostic drainage after the original verdict is frozen.

The [batch observer](https://github.com/Proto-UI/Proto-UI/blob/6a4e2b3db65878da7b5150cdad49eb9d8a1cc9d0/apps/www/src/content/docs/zh-cn/family-query-observer.ts#L108) observes the actual Promise references; it does not cancel or replace them. The caller creates one observation deadline and passes the remaining budget to subsequent batches. The deadline is not renewed per batch.

```text
original matcher settles/rejects
  → freeze verdict and pending-at-verdict
  → share one separate1000 ms observation budget
      complete: collect own getter observations, restore own hook, detach
      incomplete: preserve pending/error metadata, skip early collect/restore
  → retain original error capture/rethrow path
  → actual context-close attempt
  → incomplete cleanup: metadata + best-effort detach only, no Runtime.evaluate
```

The real negative-control browser fulfilled one backend query with `shadcn`. A private Node continuation then remained pending. That injected run deliberately does not preserve the normal caller's Promise identity; it is not evidence of a permanently hung renderer getter. It retained the original matcher failure, exhausted the observation budget after1001.613917 ms with one pending reference, completed late error evidence, closed its context and exited Chrome0. A closed-target detach error remains in the record. The source was restored to the normal caller before the final frozen combination.

This control establishes that particular expected failure/cleanup path. It does not establish a strict wall-clock bound under a starved event loop, prove context-close-failure or global browser-hang handling, or broaden unchanged capture/RPC/filesystem exception semantics. Four fake-timer unit cases are separate evidence.

## Source and evidence limits

The ten selected Git blobs match the frozen local candidate; they are not a complete loaded-source graph. Node132 remains1821/4. Catalog remains536 failed diagnostics. The current local136 positives are not substituted for canonical results. The 16 selected Header PNGs and one separately sourced negative frame are actual original bytes, not comprehensive visual/AT acceptance.

`P-SHADCN-SELECT-TRIGGER`, `P-BASE-SELECT-CONTENT` and `HC-PROPS-SOURCE-0001` are draft. `STATE-DRIVEN-STYLES` is a criterion of the first entity. `A-REACT-18-19-0001` is active only in its stated profile. No entity lifecycle is changed. The old uncertainty, rejected proposal, failed setup, experimental negative and partial controls remain factual historical inputs. Sanitized code excerpts and records in this packet are derivatives, not executed byte streams or a standalone reproduction package. Partial/ABSTAIN.
