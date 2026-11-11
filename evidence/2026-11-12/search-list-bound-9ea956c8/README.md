# Website Search list bound at enlarged root text

The Shadcn menu recipe leaves its intrinsic Content max-height unset. In this Website composition, the Search body has an available-height bound and the Command list is meant to retain an inner scrollport. The unbounded list instead expanded to its full content inside the smaller body. The one-line candidate gives the Shadcn Website Search list a relative cap from its owning scroll body. The shared Command menu recipe and other families retain their existing styles.

The clean main `b25229a9` failed both original 320px and 390px Shadcn enlarged-root cases at the list boundary. Candidate source on `9ea956c8` passed both Shadcn and both Brutalist control cases. Each original case exercises its four existing runtimes. The browser test file and original assertions and deadlines are byte-identical. A separate telemetry control on the Homepage rollback composition observed the unbounded list's 352px client height at both widths, then a bounded client height of 41px at 320 and 91px at 390 while retaining all 352px of scrollable content.

The clean candidate's separate native wheel control used a real short Docs route and a successful empty dev Pagefind fixture. With a 320×390 viewport and 200 percent root font, the trusted wheel hit the exact menu list and moved that list from 0px to 90px while the outer body stayed at 0px. Close remained usable. The earlier supplemental attempt began with the outer body 156px away from the list and timed out, with that result retained. The successful image shows the inner list and the still-reachable Close in the controlled normal session. The old image is from the original dev geometry assertion and shows the dev error/retry path.

The eight separate nested-scroll cases in the full Search file include active-target reveal and runtime activation boundaries. The attached scope covers only the list's actual scrollport and the four enlarged Docs cases.

[Search readiness and case groups](https://github.com/Proto-UI/Proto-UI/issues/848)
