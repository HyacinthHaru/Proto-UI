# Keep restored Typography carriers in place

A hidden Typography batch already held 405 carriers in their original teardown order during the original Chinese S4 startup. The previous retirement loop appended every carrier again. The repair skips the loop when those same carriers already form the required suffix. All other restoration and teardown paths retain their existing order.

The standalone change `186218c5239050da04ea462ba00cd85ace6b9e8a` uses exact main `b5e41dd601d67ba48cb5d030811f93394893116d`. The regression is red on sorted carriers and the reordered control passes on main. The candidate passes 215 focused checks, builds all 47 public packages and 685 pages, and passes workspace types and manifests.

In real Chrome for Testing 156.0.8078.79, the stock/candidate/candidate/stock counts are 2, 0, 0 and 2 WC owner reconnects for an already restored batch. All reordered arms restore the exact original order and receive two reconnects. The control retains authored text node identity through replacement and teardown.

The same eight original Typography journeys ran against fresh parent and candidate builds on macOS. Both runs pass all four Brutalist cases and fail the same four Shadcn CJK font checks. Chrome selects PingFang SC for those glyphs, while the unchanged checks require Noto CJK. The repository's Ubuntu typography evidence workflow prepares the Noto font environment separately.

The combined integration `9d10b95c274e6ef6257de58a2b729ceccc4caafd` retains all 1,268 previews in each Matrix locale and passes the selected Contents, Dialog, Header, CodeExample, Shadow and Liquid optics checks. Both original locale cases still fail the 60-second readiness check before Dialog.

[Verification](verification.json) · [Retirement control](chromium-retirement-control.json) · [Original font checks](macos-font-comparison.json)
