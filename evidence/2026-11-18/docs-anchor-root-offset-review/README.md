# Align the root scroll offset with the docs Header

Exact signed follow-up `44c6b0123e7699298e513ad728b76c6891f56ce0` for [PR #1499 review](https://github.com/Proto-UI/Proto-UI/pull/1499#discussion_r4608369486).

The earlier anchor selectors changed their owner to Header. The selector that clears Starlight's root scroll padding still matched a marker anywhere in PageFrame content. In the same strengthened native test, both locale pages had 88px of root padding with the real Header marker removed. Adding a matching marker under main alone dropped that value to 0px on the parent. Anchor clearance was no longer supplied by the Header-local selectors in that case.

The follow-up scopes the root reset to the Header's descendants. With the content marker alone, both locale tests now preserve the original root padding. The scratch Happy DOM attempt gave an incorrect match for the compound relational selector, so this behavioral check runs in Chromium with the real compiled CSS. The existing positive no-JavaScript title-anchor and reading/splash checks retain their assertions.

Fresh Website build completed 685 pages using unchanged package outputs from the verified parent. Workspace types pass. Three focused files pass 45 tests. The three selected original native cases pass, with the new fallback check executed for each locale. Seven neighboring cases are filtered. The original S4 readiness failure remains a separate scope. Local manifests, timestamps and raw result paths are represented by bound values and hashes.
