# Shadcn Rhea demo fixture verification

The test commit `45599f2c153db54538555434940325268681f5a5` is based on `21af3bec014503e68782a6f1f3756aec2bb987cd`. Its five paths are test files. The registration tests still require the exact prototype inventory, including the explicitly authored Shadcn scope. The Dropdown recipe tests check the exact outer scope and then apply the existing prototype, static source and behavior assertions to its authored child. The plain and inset labels exercise the Rhea 0.5rem and 1.75rem padding. The existing component test still covers the fixed New York fallback.

The same eleven files yielded **221 passed and 18 failed** on main, and **228 passed and 11 failed** on the candidate. Seven failures were removed. The remaining test names and first errors match the baseline.

The signed candidate built 47 packages and 683 website pages. Manifest and workspace type checks passed.

A separate local Chrome 156 probe exercised the actual packed English Dropdown page with Web Components. The public toggle, menu trigger and Escape exercised inset on, off and on in both LTR and RTL. The measured physical-left padding was 28px, 8px and 28px at a 16px root font. Both group names resolved to their live labels. The screenshots show the settled menu. The [verification record](verification.json) includes the page hash, geometry and PNG hashes.

The Actions-only historical Dropdown geometry test uses a fixed New York 2rem inset and aligned text oracle on the current Rhea route. That workflow was not executed here. The local Rhea data is available for reconciling its profile boundary.
