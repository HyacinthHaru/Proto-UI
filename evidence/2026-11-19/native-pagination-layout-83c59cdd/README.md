# Native pagination layout

Source `83c59cdd92dbc270bf5213d4f5e96b381f7afd87`, tree `f5b23cfadd48a55c3efb46ae801e69a3d7d3ff13`, based on `21af3bec014503e68782a6f1f3756aec2bb987cd`.

An unenhanced Starlight pagination link inherited 16 px vertical padding. The enhanced Surface used 4 px vertical padding and a 36 px minimum. Both Bootstrap and Shadcn footer rows shrank by 17 px at 390 px, and the Brutalist row by 16 px. The native fallback now uses the same responsive block geometry and wrapping metrics. Each link keeps the same anchor, direction, caption and destination across enhancement.

- All eight added cases failed against the unchanged main production sources. The signed build passes the eight cases plus the original pagination selection and long-label tests. The coverage includes 320 px with a 200% root font size and RTL pagination, plus the no-script forced-colors focus and Enter navigation case.
- The signed build produces 683 pages and passes workspace types and 52 source tests. The nine packed Chrome observations sample fallback, each link's enhancement, and the resulting layout. Each row stays within one CSS pixel of its initial height. The four matched baseline and candidate cases have identical enhanced box dimensions and sampled Surface styles.
- The exact previous #1577 application was locally rebuilt with this stylesheet and the original Contents test from `f335ec85`. All 36 Contents open/close cycles pass with the original wheel assertion and deadlines. The Bootstrap-specific footer startup preparation added later in #1577 is absent from this composition. Both modified source files and the prior build were restored afterwards.
- With scripts disabled, all three tested routes retain their native anchors and Enter navigation. The forced-color fallback uses a system-color focus outline. The fallback and enhanced screenshots show the same 390 px Bootstrap route.

The broader checks retain the same 53 base production-bundle findings and the two Search disposal typing errors tracked by #1534.

[Verification](verification.json) · [Enhanced Bootstrap](footer-bootstrap-2-3-2-zh-cn-390.png) · [Native fallback](footer-bootstrap-no-script.png) · [Forced colors](footer-forced-colors.png)
