# Sidebar native disclosure fixture

The original mobile fixture sometimes waited on the native startup Contents button after the active public Popover had replaced it. In the recorded main failure the fallback was hidden with a 0 × 0 box, and the active WC button was visible with a 44 × 44 box. The fixture scopes its existing button role query to the active Contents generation.

The no-JavaScript fixture opened UI Libraries and immediately checked its first descendant link. That link belongs to the still-closed native Base subgroup. The fixture now clicks the same link's nearest native subgroup summary and retains the original visibility assertion. The two original exact-head browser images show those states on the actual Docs route with JavaScript disabled.

The original selected cases failed on both current main and exact Contents candidate `26418fe1`. The same test-only patch passed all 7 cases on both product sources. The exact signed main-based fixture `05ec69ea517e33c88117a21e9beb810e8ccedad8` also passed 7/7 and workspace type checks. The evidence distinguishes each actual execution and the supplementary no-JavaScript capture.

[Original exact hosted failures](https://github.com/HyacinthHaru/Proto-UI/actions/runs/43088111759/job/130795062534) · [Contents PR](https://github.com/Proto-UI/Proto-UI/pull/1438)
