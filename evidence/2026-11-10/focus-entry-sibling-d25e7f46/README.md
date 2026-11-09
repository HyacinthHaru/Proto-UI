# Focus Entry sibling-position follow-up

Signed candidate `d25e7f46bfffe2efe3279ad48ed1fd2269865bd9` on main `0607c6c5c386b8a932ab850e92a8873b2121dc45`. This is the follow-up for the [structural negated subject review](https://github.com/Proto-UI/Proto-UI/pull/1377#discussion_r4512539256). Register potential positional subjects even when they start out of position. Their actual parent receives child-list observation and reuses the existing entry refresh lifecycle. The regression tests exercise real CSS, hidden sibling insertion and removal, both initial states, and a direct body parent with an earlier conservative rule.

The original main failed all four added native cases. An intermediate control with first-child in both placements passed the two nested cases and failed the two direct-body cases. The final focused suite passed 169/169. Full types inspected 1,179 Astro files with zero errors, zero warnings and 25 hints. No catalog, website, probe, deadline or workflow changed. All seven Shadcn Button CodeExamples were retained.

| Local run | Shadcn React |        Shadcn Vue | Shadcn Vue2 | Closes | Exit |
| --------: | -----------: | ----------------: | ----------: | -----: | ---: |
|         1 |        693ms |             938ms |       933ms |     24 |    0 |
|         2 |        691ms | Timeout at 1000ms | Not reached |      6 |    1 |
|         3 |        692ms |             940ms |       942ms |     24 |    0 |

The elapsed values are the original assertion wall times. Late observations in the archive preserve actual state after a timeout. Dialog passed 8/8 locally, with 196 observations, 120 PNGs and complete runner cleanup. The screenshots shown separately are unmodified observations from the exact local candidate, including the post-verdict Vue observation from run 2.

The [official main cycle](https://github.com/Proto-UI/Proto-UI/actions/runs/42674546918) checked out `0607c6c5c386b8a932ab850e92a8873b2121dc45`. Its [Contents shard](https://github.com/Proto-UI/Proto-UI/actions/runs/42674546918/job/129352498796) failed the original Shadcn React 1000ms publication check before Vue. Its [Dialog shard](https://github.com/Proto-UI/Proto-UI/actions/runs/42674546918/job/129352469059) logged all eight Dialog cases passing. Both whole shards later exited 124. The dedicated [Popover Navigation job](https://github.com/Proto-UI/Proto-UI/actions/runs/42674546918/job/129356573834) finished 32/32, including the original wheel path in all 16 mobile cases. It exercises a different surface from the replacement shell under #1380. The official main results do not validate the newer candidate or independently calibrate #1272.

AI assistance: Codex.
