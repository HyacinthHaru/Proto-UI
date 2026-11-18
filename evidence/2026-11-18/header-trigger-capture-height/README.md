# Homepage Header trigger diagnostic

The existing homepage browser assertion expects a 44px Family Select trigger at all widths. Its failure capture still expected 36px on a wide viewport. The test now uses one 44px expectation for capture and assertion, with the original half-pixel boundary and finite-size guard.

The exact preceding source and the exact candidate both pass the original native responsive homepage case in Chromium 156.0.8078.79. Each run uses the same served production HTML. On the preceding source, the light and dark 1440px runs write diagnostics reporting actual height 44px, expected height 36px and a fitting Header. The original assertions pass. The candidate produces zero diagnostic captures for those passing observations. The screenshot shows the actual preceding light viewport that was captured unnecessarily.

The focused regression checks 44px and 36px at desktop and mobile widths, the original 0.49px and 0.50px tolerance boundary, and a nonfinite reading. Seventeen affected tests pass. Source changes are limited to the two test files.
