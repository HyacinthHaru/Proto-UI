# Hosted Main Brutalist and S4 receipt

The scheduled run directly executes upstream main at 0f0955a9. This receipt binds completed jobs observed during the scheduled cycle. It does not report the aggregate cycle as complete.

The [Homepage dogfood shard](https://github.com/Proto-UI/Proto-UI/actions/runs/44254293045/job/134632266062) rejects the original 1-second Brutalist family poll with its third lookup pending. The writer observer records the root's completed family write approximately 89.8ms before the verdict, using the same run's page time origin and Node time origin. MutationObserver delivery occurs approximately 208.8ms after the write. The utility-realm getter first reads Brutalist for the third lookup approximately 590.2ms after the write and 500.4ms after the verdict. Node receives the value approximately 1.4ms after the getter return. The getter's own before/after times are equal at the retained clock precision. The record does not distinguish transport receipt and renderer scheduling before the getter starts.

The same shard also reports a 1-second failure in the cross-runtime Docs Contents case. The recorded Brutalist timing above belongs to the separate preference reconnect case. CodeExample has two separate hosted English 1440px cases failing on the expected file-tree count. [Hosted CodeExample shard](https://github.com/Proto-UI/Proto-UI/actions/runs/44254293045/job/134632266042).

The [S4 and Dialog shard](https://github.com/Proto-UI/Proto-UI/actions/runs/44254293045/job/134632266072) passes all eight selected available-space Dialog cases. The Chinese full S4 fails its 60-second readiness deadline. The English case fails its 150-second outer deadline. The logged Node intervals from readiness entry to error delivery are 115.62s and 135.45s and reflect when the runner observed the errors.

The [public package job](https://github.com/Proto-UI/Proto-UI/actions/runs/44254293045/job/134632240550) succeeds. The [general job](https://github.com/Proto-UI/Proto-UI/actions/runs/44254293045/job/134632265851) fails at coverage-matrix validation with 1,197 issues before its general test assertions. These are distinct from the local Website inventory.
