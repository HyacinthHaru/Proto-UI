# Search menu physical geometry

[PR #1435](https://github.com/Proto-UI/Proto-UI/pull/1435) head `a7ed62929ead8e63e069af7a413338dc05a882f9` passed **68/78** original Chromium cases. All 60 passes from the previous head remain. All eight Rhea menu cases pass the original geometry assertions after the browser ends the relevant CSS animation and size transitions. The test retains the immediate and settled observations at the original and 200 percent root sizes.

The preceding dirty diagnostic on the same product source observed pui-enter and max-width/max-height transitions. The exact signed run retains the same measurements. Vue2 mobile at 200 percent moves from 358px to the expected 326px while the actual max-width transition ends. The numeric tolerances, input actions and 90-second case budget are unchanged. Two original enlarged viewport captures appear here.

The separate [hosted shard](https://github.com/HyacinthHaru/Proto-UI/actions/runs/42951861312/job/130297865157) binds prior `5f2d845c`. All eight original 1000ms readiness observations were on time. The full hosted file logged 54/78 and the enclosing shard exited 124. The managed production Pagefind run is tracked separately.

AI assistance: Codex.
