# Additional Slider Values request guard evidence

This packet supplements the exact 1c6 checkpoint. It binds product b1e62928c205e318da615a77b4e457f1736fd7de / tree24cebffe7e6e8a2547b5106edde2cc9674e77d69 on foundation15317b8b. The two-file increment changes only the existing request guard preparation and late cancel admission, plus two direct WC fixture regressions. No value, numeric, collision, old scalar, host activation, exception rollback or immediate idle-on-error policy is introduced.

| Executed transition | Before repair | Candidate observation |
| --- | --- | --- |
| Uncontrolled10; notifying State observer throws on request20 | Original Error propagates; owner10, readytrue, phase notifying | Same original Error and owner facts |
| Remove observer and call late cancel | Returns true outside active request | Returns false |
| Subsequent request30 | Returns false indefinitely | Returns true;owner30;phase idle |
| Existing accepted proposal20, later request30 observer failure | Controlled/uncontrolled control retained separately | Proposal20 commits once;second commit false;new request40 accepts |
| Controlled owner with ignored proposals | Owner remains10 | Owner remains10 before/after request40;no rollback or forced echo |

The final production test file's SHA256 is180ac79650683a9e64aa46dccd80f0a2cee4f228a850068e5e51416fb12d1c05. Initial author baseline checked later-request rejection; the revised final identical test additionally checks late cancellation and same Error identity. Both red logs remain distinct. Same final54tests:1fail53pass before repair;all54pass as part of the final10files354pass. Independent8controls include four Slider busy/prior-proposal controls and four Transition boundary observations, not eight separate Slider defects. All325loaded tracked inputs match final b1e, while execution provenance remains1c6plusonefrozenvalues-root snapshot. Old40Form/Search/Menu/Drawer controls retain their original execution time/provenance:336inputs were rebound individually and neither changed path is in that set.

Transition feedback: actual asTransition host ExposeEvent sink throws are isolated by the current event implementation; both throwing and normal sink controls reach preparing→entering→entered. A deliberately throwing internal machine driver remains preparing; this distinct observation does not establish a public subscriber defect or choose the unresolved global callback-error policy. No Transition change is included.

Accordion feedback: source tracing finds Web native click→PressCommit and GPUI Accessibility Click→activate→HostInput::Click→PressCommit. The missing explicit click handler alone does not prove failure, and blindly adding one could duplicate the existing toggle route. This is source evidence only, not executed native assistive-technology acceptance. No Accordion activation change is included. Host document-adoption feedback remains the Adapter/resource owner's work.

These are public Runtime/State/Expose boundaries with disclosed WC happy-dom and synthetic-host fixtures. No new PNG, trusted browser click, physical geometry/focus, whole Adapter parity, installed package or AT result is claimed. Source review remains human-assisted unassessed/partial/ABSTAIN.

## Full general failure comparison

Exact b1e general plan ended exit1:1154files=1123passed/28failed/3skipped;11566passed/362failed/34TODO,1unhandled. The explicit C-related41 files / 553 tests all pass. Compared with1c6,359failed titles remain common and3are new to this full-run observation: WC mixed Prop/Meta color scheme, WC portal-origin removal and Shadcn Dropdown focused appearance. These are retained, not asserted green or all inherited.

A bounded pair ran the same original3files with unchanged assertions/timeouts and max2/min1. Before-change1c6 had1fail10pass (Dropdown);b1e had2fail9pass (Dropdown and portal). Both runs loaded exactly399tracked inputs with identical path/hash sets, and neither changedSliderpath is loaded. This limits direct attribution to the two-file Slider patch but does not determine the full-run failure mechanism or classify allthree as preexisting. No repeated full run, weakened assertion or unrelatedA/Bfix was used to remove these failures.
