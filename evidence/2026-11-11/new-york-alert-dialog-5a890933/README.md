# New York AlertDialog at 320px and a 32px root font

The [baseline Linux job](https://github.com/HyacinthHaru/Proto-UI/actions/runs/42953279384/job/130302472190) executed the original suite on `645310033e7573b108eadbb9167fc3edd5b4656e`. All eight New York narrow/root32 combinations failed across four runtimes and two themes. Their panel measured 254px client width and 277px scroll width.

The [candidate Linux job](https://github.com/HyacinthHaru/Proto-UI/actions/runs/42956789913/job/130313754304) executed the same suite on `5a890933a5701fb2924830480c9304254e99d36e`. All 32 passed. The eight affected panels measured 254px client and scroll width. The browser file, copy and test deadlines are unchanged. The containing shard hit its 900-second limit and exited 124 after the AlertDialog file had completed.

The selected WC/light frames are unedited Chromium captures from their respective runs. At this font size, the authored long words wrap across lines. The viewport and root font are held constant. The JSON files expose the corresponding run reports. The reconciliation verifies both service ZIPs and the digest of each of their 240 referenced AlertDialog screenshots. The result covers this New York fixture, with root-font scaling and the original layout, keyboard, outside-input and focus-restoration checks.
