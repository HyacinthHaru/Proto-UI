# Sidebar history under controlled production HTML delivery

A separate Chrome 156 control served the actual earlier clean `dbe246b` static output. The two navigations received the same 2,476,971-byte quick-start HTML, bound to the retained build output hash, with one artificial 500ms pause before the twelfth Sidebar group. The production bundle gate independently failed as recorded in the paired baseline.

At 390px, 28 pre-epoch observations contain 11 parsed groups with no assigned identities while the Sidebar pane is closed and display:none with a zero rectangle. At 1440px, 29 pre-epoch observations show a visible 240px-wide pane with the saved UI group still closed. After delivery completes, both widths show 18 identities and the saved UI group open. The controlled delay reproduces the pre-bootstrap DOM shape on the production HTML. It does not assign the original hosted response's timing or alter its verdict.
