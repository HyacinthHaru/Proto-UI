# Language selector bundling: complete-preview delivery diagnosis

Recorded 2026-10-25 UTC. Related work: #933, #982, and the website inventory delivery follow-on #999.

## Reproduction and classification

At #999 head `8be2ca58c7017ca037ea94170b9be7967fd6b744`, [the canonical docs-preview job](https://github.com/Proto-UI/Proto-UI/actions/runs/40165610490/job/121085918036) checks out the exact head, builds651 pages in62.51seconds, then rejects the complete ZIP because expanded size exceeds104857600 bytes. The log does not disclose its total expanded bytes. Compilation succeeded; delivery admission did not. Do not describe this as a successful preview, a compiler semantic failure, or a missing-check pass.

This uses the delivery/installation distinction recorded in the [cumulative composition audit at exactee40](https://github.com/Proto-UI/Proto-UI/blob/ee40d097383321316237210f799c6c73e3e07768/internal/coverage-matrices/composition-delivery-parity.md). That record is on the separate #1001 branch; this link is evidence context, not a source dependency or claim that its changes are included here.

## Existing repair extracted, not reimplemented

The production repair and two tests are identical blobs from our existing [#982 commit e394249](https://github.com/Proto-UI/Proto-UI/commit/e394249a4b1ec75e89154911224e7b5648120a1e). Both current main4d075 and #9998be retain the original LanguageSelect blob97edb99 and test721c716. The inline initializer repeats per rendered instance/page; moving it into the existing Astro processed module shares its payload while keeping both controls and existing per-root, DOM-ready and Astro-page-load lifecycle behavior.

Exactly three existing source/test blobs are reused, plus this diagnosis. No feature/UI component, content, route, archive budget, assertion, dependency, lockfile or security setting is removed or relaxed. Context snapshots, Rhea/profile changes, Header/sidebar close repairs and reserved runtime-client/native-links/startup-theme tests are excluded. #999 inventory/resolver/config/generated-manifest ownership is untouched.

The preparation initially targeted #999 for current website inventory/build integration order, not because LanguageSelect bundling semantically depends on that resolver. During preparation #999 merged at2026-10-25 06:03:38UTC as357068f0f371dd40826b81da43bd4ef5df73bee7. The carrier therefore targets this actual main successor, whose tree is identical to the checked #9998be tree; no obsolete branch is used as a fictitious open stack. Existing #982 keeps the same fix and is reconciled after upstream integration; no duplicate Issue or second completion credit is intended.

## Evidence boundaries and acceptance

Historical controlled evidence:652built pages/3857files were retained, expanded output108082012→104629960 bytes (3452052-byte reduction), and15focused units passed. Later exacta59 hosted complete documentation admission passed. These are historical results on a different closure, not proof that current651page output will fit; the old remaining margin was small and current overage is unknown.

Current preparation checked both changed test files with standalone TypeScript options:0 diagnostics, and transpiled the Astro processed script with0 syntactic diagnostics. This is not a whole-site typecheck or a behavior test. Current preparation retained an actual Vitest startup failure before collection: Rollup native loading is rejected by the unchanged bounded environment with ERR_DLOPEN_DISABLED. No15case current pass or native result is claimed. Exact-head CI must execute the real suites when preceding public-doc/release checks permit; early prerequisite failures are not test passes.

Required acceptance remains full canonical docs build and complete ZIP admission under the unchanged100MiB limit, all current baseline routes/resources preserved, with actual expanded/compressed counts and exact head. Dedicated same-head header/sidebar locale initialization, cookie/storage/navigation and browser screenshots remain uncovered in this small extraction. Existing #982 native evidence and its later sidebar-close fix cannot be borrowed as this candidate's verification. The carrier remains Draft pending required validation, review, DCO and conflicts; this does not waive unrelated red checks or establish long-term bundle capacity.
