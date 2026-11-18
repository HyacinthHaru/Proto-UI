# Packed Dialog midpoint hit check

Exact signed test-only head `1d4f591dbf00fa9f3649b2150b60a9240c9c2560` on `bcc9dd4b75e410cf858886a7058f4ec21c9cae1b`.

The existing 320 by 360 viewport and 200 percent long unbroken Button generated a 160 by 1,338 pixel Button in each Web Adapter. The parent's ordinary scroll helper left that Button's midpoint outside the viewport. The fixture now scrolls oversized actions inside the existing Dialog before reading the same midpoint and running the original hit, size, width, focus and keyboard assertions. The label, rendered controls and deadlines are retained.

WC, React, Vue 3 and Vue 2 each show the same dimensions and a successful hit on the candidate. The full packed selection ran 21 cases with all 21 passing, including Contents, Dialog, CodeExample, copy and nested scroll. Header first frames passed at 320 and 390 pixels. The site built 685 pages using the already verified parent package output. The two frames are the actual parent failure and the candidate's fixture before midpoint alignment. The JSON contains the hit verdicts.
