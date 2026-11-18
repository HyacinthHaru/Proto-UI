# Anatomy order and Tabs workspace regression controls

Both candidates use main `3a537056b14bc8fd143d67ff63a55b2334981690` as their direct parent and have separate signed heads.

## Anatomy order

At the start of an order notification, both subscribers have the same order signature. A later host read moves a real DOM sibling and supplies the current compareDocumentPosition method on the same DOM target. The original pair cache returns the earlier order and delays the later subscriber's callback to the next notification. The correction keys the comparison result by its method as well as the targets.

Pinned Chromium 156.0.8078.79 ran the original, candidate, candidate and original in four independent pages. The two compared bundle graphs have the same 57 files and vary only the Anatomy implementation. Native position flags change from preceding to following. The first round has delivery counts [0, 0], [0, 1], [0, 1] and [0, 0]. One later notification leaves both counts and versions at [1, 1] in every arm. The matching unit regression fails on the parent. The standalone candidate passes 500 focused tests, builds Anatomy and its four required public dependencies, and passes the manifest check. [Candidate source](https://github.com/HyacinthHaru/Proto-UI/commit/d977985a7401e391c0c3c2a516edb65c8b07c30e)

## Tabs workspace types

The WC demo-renderer coverage added in #1497 imports the New York Tabs demo. That import makes the shared preset part of the workspace TypeScript graph. The Website-only alias for DemoSpec fails there.

The first clean attempt also lacked two generated companion imports. After running the existing CLI build and Website generator, the only remaining baseline error is TS2307 on the shared preset. The candidate replaces the type import with its relative path. The workspace command and all seven WC demo-renderer tests pass. Both versions emit the same 1,921 JavaScript bytes for the preset under the declared transform. [Candidate source](https://github.com/HyacinthHaru/Proto-UI/commit/093801ceaa1609fd3f36bd2681cb73fff7498745)
