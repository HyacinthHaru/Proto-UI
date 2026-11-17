# Split exit paint, namespace handles, and caller selection

The exact previous #1484 head reproduced three failures with one passing native selection control. The exit animation stayed at zero opacity after native completion. The namespace Root use lost its required preflight, and the late-upgrade caller selection could be cleared before acknowledgment.

The split check now connects the live admitted exit tokens to the filled native animation on the actual surface. The external zero-opacity control cancels that animation and still rejects reuse. The selection check validates existing caller range boundaries and direction before acknowledging publication. Both the unchanged and cleared late-upgrade cases ran in native Chrome.

The CLI resolves known namespace style members in the current lexical scope. Decoration-only use emits Template paint and a Root use preserves verified-length preflight. The built CLI exercised both routes. A namespace that escapes without a resolved member marks its exported handles conservatively.

The final targeted run passed 320 tests and workspace types. The broader run passes 753 cases with the same 25 baseline failures and first messages. The signed combination retains the earlier scrollport patch and builds all 47 public packages. All four selected native review cases and the original isolated Dialog profiles passed. Dialog exercised Light, split and mixed in both source and public dist.
