# Homepage entry copy alignment

The product-direction context in [PR #777](https://github.com/Proto-UI/Proto-UI/pull/777#issuecomment-5962939409) clarifies the intended audience and meaning of the existing example; it does not restart design or add acceptance scope.

This bounded follow-up keeps the four accepted Chinese/English hero lines unchanged. The example heading connects framework switching to reusing interaction definitions. Its `.demo.ts` source is labeled **Website demo configuration**, because the file composes website examples from Prototype references; it is neither a Prototype definition nor a public application-integration API. Runtime/library changes continue to update that same configuration link.

The existing **Get started** / **开始使用** actions now lead to their localized, hands-on Quick Start pages. The header's documentation entry still leads to the introduction, so the two action labels retain distinct promises. There are no new product entries, sections, complex examples, Compiler promises, or protocol requirements in this change.

Source-bound presentation tests preserve the slogans, check the source-kind label and reusable-interaction explanation, and verify that both action destinations resolve to existing CLI-based Quick Start content. These tests establish copy and route boundaries, not rendered visual quality. New exact-head screenshots and complete CI remain required evidence for the continuing homepage work; historical screenshots remain bound to their original commits.
