# Hosted Contents and Dialog on #1386

Signed product head `0df298c4b48c2e4805ec7ce81b5644c0f4e5aef5`, tree `1f6d91d62c9d3f73055ae82f426947ff9b05183b`. The original Shadcn Button page retains seven CodeExamples. The candidate does not change the page, test sources, original Contents 1000ms assertion, the 180s Contents case deadline, or the 150s Dialog case deadline.

The [owned-fork dispatch](https://github.com/HyacinthHaru/Proto-UI/actions/runs/42777451144) ran the existing CI workflow. The verified test plan placed Contents in shard 5 and Dialog in shard 8. The separate Homepage capture job ran on pinned Ubuntu 24.04. The browser shards used the workflow's ubuntu-latest image, which resolved to Ubuntu 26.04 for this dispatch.

- [Contents browser shard](https://github.com/HyacinthHaru/Proto-UI/actions/runs/42777451144/job/129699285874). First recorded failed transition is shadcn/react at the original 1000ms assertion. Its post-verdict snapshots are wc at +1526.2ms and react at +1990.5ms. Recorded closes before exit: 3. The complete shard exited 124.
- [Independent Homepage job](https://github.com/HyacinthHaru/Proto-UI/actions/runs/42777451144/job/129710047397). First recorded failed transition is shadcn/react at the original 1000ms assertion. Its post-verdict snapshots are wc at +1509.6ms and react at +2005.7ms. Recorded closes before exit: 3. The enclosing browser step reached its 600s limit.
- [Dialog browser shard](https://github.com/HyacinthHaru/Proto-UI/actions/runs/42777451144/job/129699285950). The original Dialog file passed 8/8 with 196 observations and 120 referenced PNG hashes verified. The complete shard exited 124 and has no final aggregate Vitest JSON.
- [Current upstream main](https://github.com/Proto-UI/Proto-UI/actions/runs/42771017635) is independently bound to `0607c6c5c386b8a932ab850e92a8873b2121dc45`. First recorded failed transition is shadcn/react at the original 1000ms assertion. Its post-verdict snapshots are wc at +1572.8ms and react at +2113.5ms. Recorded closes before exit: 3. Dialog's original file passed 8/8 in that cycle. The different runs do not measure a causal performance effect of the candidate.

The screenshots are original post-verdict React and settled Dialog frames. The post-verdict React selection does not establish an on-time publication. The archive contains selected derived text records, with original and published hashes, plus the GitHub artifact bindings in the summary. Actual complete ZIPs remain linked to the Actions run. A candidate Dialog pass does not independently calibrate #1272.

AI assistance: Codex.
