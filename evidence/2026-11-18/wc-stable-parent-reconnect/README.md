# WC reconnect with a stable logical parent

In an ordinary same-owner reconnect, clearing the temporary host projection can leave the logical parent unchanged. The candidate compares the physical parent's current token with the existing logical parent before unlinking it. Actual owner changes still use the previous unlink and rebind sequence. The explicit-authority and Portal paths retain their existing ownership behavior.

The exact old implementation reports an unset parent to the lifecycle subscriber during a move between two wrappers of the same owner. The added case reproduces that observation with 13 other cases passing in the WC Portal suite. Each exact candidate passes 205 cases across 13 focused files.

Both native source-fixture comparisons use pinned Chrome and four fresh page contexts in parent/candidate/candidate/parent order. The two variants differ only in the two scoped implementation inputs. Both old contexts observe unset during the same-owner move. Both candidate contexts observe the same owner. The original token survives, the physical move takes effect, the cross-owner move still rebinds, and the explicit owner control remains stable. The measurements bind source input and bundle hashes for both the integrated and main-based comparisons.

Signed integrated 7a376034 and standalone 9540ea85 carry the same normalized patch. Both build 47 packages and 685 Website pages, pass workspace types and manifests, and report the package-budget results under the existing advisory policy. The exact main-based baseline comparison and all nine rows are included.

Both compiled Website products pass 15 selected original browser cases with nine filtered and the Header first-frame probes at 320px and 390px. Each checked article retains all nine CodeExample blocks. The visual is the actual Brutalist React Contents panel from the main-based product. The integrated full Chinese S4 case still reaches the original 60-second readiness timeout with 1,268 previews and the original 150-second case limit. The English case is filtered.
