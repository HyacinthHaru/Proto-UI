# S4 A11y scalar replay investigation

Seven bounded DevTools pause offsets were scheduled in the full Chinese Matrix. Six yielded named stacks and resumed before the original test deadline. Three sampled paths were in A11y projection and two were in Scroll layout reads. Both repeated paths descend from Anatomy target notifications. Samples are individual stacks, not a CPU profile.

A separate diagnostic A/B pairs two signed local compositions with the original Chinese test, 1,268 previewers, the 60-second readiness assertion and the 150-second case limit. The candidate adds only the A11y scalar change and regression before applying its observation overlay. The candidate preserves identical scalars only on the same connected view binding with exclusive ownership, current physical values, and no scalar ID. Shared owners, host rewrites and identity transitions retain the full release/acquire path.

At approximately page +106.015 s, the baseline had received 827,479 projection updates and logged 32,701 ms cumulative scalar release and apply duration. The candidate had received 1,489,978 updates, retained 4,583,854 scalar entries, and logged 4,157 ms across the corresponding stages. This comparison describes retained reports in two instrumented runs. The original test still ended during startup in both cases.

The focused replay test failed on upstream main because a settled host role was withdrawn and restored synchronously. All 185 focused module and contract tests, across seven files, passed for the signed local candidate. The test confirms a subsequent external role rewrite is reprojected and restored on release. Workspace types passed after generating the ordinary stylesheet artifacts. The source change remains local.
