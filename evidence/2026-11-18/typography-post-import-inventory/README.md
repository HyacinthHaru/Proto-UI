# Refresh Typography targets after runtime preparation

The original Chinese Matrix startup captures 405 source targets before loading the renderer modules. Before the renderer actually starts, all 428 targets are already present. The stock path publishes the original 405 targets and then publishes a second batch with 428 targets.

This patch takes the final inventory after runtime and prototype acquisition. A focused regression replaces a native paragraph during module acquisition and checks that the first published batch owns the incoming heading and retains the authored text nodes. Exact parent `b5e41dd601d67ba48cb5d030811f93394893116d` has one regression failure and 92 other passing cases. Exact head `8b644e2d1a08b05149e64be20e3a95c5bf52a5ea` passes all 214 focused checks, builds 47 packages and 685 pages, and passes workspace types and manifests.

On the same packed integration assets, the one-asset Chromium control changes the observed publications from 405 followed by 428 to a single batch of 428. Both control runs retain the original Matrix readiness timeout. This measures the duplicate render removed during the observed startup.

The unchanged eight native Typography cases on macOS show the same four Brutalist passes and four Shadcn CJK font failures as the separately rebuilt main. Chrome selects PingFang SC for the CJK text and the original Shadcn assertion requires Noto CJK.

Exact combined integration `bc763ddf8dba6cfde13f2158a1f3672373d8d82f` preserves all 1,268 previews per locale and passes the selected Contents, Dialog, Header, CodeExample, Shadow and Liquid optics checks. Both original language cases still time out before the Dialog journey.

[Verification](verification.json) · [Chromium inventory control](chromium-inventory-control.json)
