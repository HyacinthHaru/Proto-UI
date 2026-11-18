# Physical context menu event ownership

A native contextmenu from a nested root used to reach the child and its physical ancestor's semantic root listener. The changed physical path now checks the owning root through the existing Event router. The native registration point and Portal fallback mechanism retain their current behavior.

The existing retarget-routing suite with its new contextmenu owner row reports 13 passes and one failure on the old code. Both exact candidates pass 67 checks across 13 files, including context-menu input on all four official Web adapters.

The pinned Chrome source comparison uses four fresh contexts in parent/candidate/candidate/parent order. Only one implementation source changes. Trusted right clicks inside the nested root reach child and outer on the parent, and only child on the candidate. A target in the outer root reaches outer in all runs. The external Portal target reaches its child owner in all runs.

The same-source order control holds the existing contextmenu listener until after an authored native stopImmediatePropagation listener and semantic subscription. In the fixed-registration controls, the semantic event precedes the later native stop. In both deferred controls, the native stop consumes the event first. The physical-root and external Portal cases exercise that distinction.

The earlier signed 7a376034 S4 registration census reached 12,288 routers at the delivered page 58.7207-second sample. It recorded 24,576 contextmenu listener registrations and zero corresponding semantic subscriptions by that checkpoint. These are actual observed registrations in one build. The order control shows the observable effect of changing registration timing.

Both signed 81f32ee8 and main-based 4ea0c3ad build 47 packages and 685 pages, pass workspace type and manifest checks, and run the package budgets with the existing ceilings. Both pass 15 selected original browser tests with nine filtered, the Header first-frame checks at both widths, and all nine CodeExample blocks in the checked article. Full original Chinese S4 on the integrated build still reaches the 60-second readiness timeout with 1,268 previews and the original 150-second case limit. The English case is filtered.
