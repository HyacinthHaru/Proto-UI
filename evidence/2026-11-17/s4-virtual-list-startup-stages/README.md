# S4 Base Virtual List startup stages

All recorded runs used signed local source `62135570`, the original 1,268 Chinese previews, 60-second readiness wait, 150-second outer deadline, Chrome 156.0.8078.79, Node 24.21.0, pnpm 10.32.1 and one worker. The English case was unselected. The observation hooks and load-timing controls are local diagnostics. Full S4 still fails.

Baseline body markers show the Base Virtual List demo and Web helper executing. All four runtime previews then await the three Base Virtual List prototype registrations, with neither render nor setup reaching entry. The served Base prototype scripts contain the execution markers, but none of those bodies emits a marker in that observation. The browser records HTTP 200 and completion for their module entries.

The first shared-import attempt altered shadowed Finf declarations. The active manual map overrides those IDs, and the shared-import marker was absent. The corrected same-stage shared Promise runs once at page +15.93 seconds and remains pending through the original outer timeout. The held prepare stage persists for all four Virtual List owners.

The early-start control uses the same active Promise and starts it with the original Base demo request at page +9.24 seconds. It settles at +15.47 seconds. Every replica finishes all three prototype loads and enters render. WC, React, and Vue 2 finish startup after their original setup. Vue emits render entry and no return by the observation limit. The first missing preview in the last original readiness message is WC Shadcn Calendar. The entire scene still hits the original 150-second outer deadline.

These results distinguish the module acquisition timing from the Virtual List setup in this composition. The early-start rule is an experimental site overlay. The report preserves the invalid first control and makes no deployment or full-suite claim.
