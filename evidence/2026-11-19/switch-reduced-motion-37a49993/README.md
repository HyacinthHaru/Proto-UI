# Switch and Shadow Split reduced motion

Source `37a4999352892c6ba2721ce4caed0dcf630976d0`, tree `4f6410c4bcdf13b52205b6457fb35caf35f6d219`, based on `ea4637c2787763b6f1d05806718564414f8dc7ca`. The failure observations use the preceding main `21af3bec`. The five affected source paths match between those two base versions. The final signed candidate includes the fixture DOM typing repair and uses the newly integrated main.

The public Switch follows its pinned CSS transitions. The older browser assertions still expected a resident inline color writer, and the palette lifecycle DOM fixture used the public declarations to start that unrelated ownership test. The revised tests give the resident fixture explicit private declarations. The public browser test checks the actual CSS transition, intermediate color, physical Thumb travel and the independent canonical palette read.

After reaching the original reduced-motion assertions, Chromium exposed two defects. The document track was still interpolating its color. Shadow Split's inner surface had `transition-property: none`, while the host that owns Thumb transform still carried the ordinary transition. The Switch Root now projects its own reduced-motion state. The CLI emits the split host override after the normal host declarations while retaining the existing inner rule. Both scopes settle the exact original travel and color at the original 30 ms sampling step.

- Exact main runs reproduced five fixture failures and eight public Switch browser failures. Exact signed verification passed 213 source tests, all 12 Switch browser cases and 2 separate resident-motion browser cases. The eight direct public cases cover both sizes, Document and Shadow, at 16 px and 32 px root font size. Existing reversal, controlled rejection, native pointer/touch, disabled, and reattach checks run in the same browser cases.
- The style preset check, 47 package builds and manifests, 683-page site build and workspace types passed. The local package budget report retains its advisory findings. Astro still reports the two existing Search disposal typing errors tracked by #1534.

[Verification](verification.json) · [Document default](switch-document-default-16-settled.png) · [Shadow default](switch-shadow-default-16-settled.png) · [Shadow small at 32 px](switch-shadow-sm-32-settled.png)
