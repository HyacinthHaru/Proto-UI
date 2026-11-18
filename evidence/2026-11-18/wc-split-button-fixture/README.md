# Include Base Button styles in the Shadow Split test fixture

The Shadcn Button invokes the Base Button setup, which contributes `select-none`. This test generated a companion by scanning only the Shadcn Button directory. The CLI collector returned 130 tokens for that directory, while the Base Button directory contributed one additional token, `select-none`.

Commit `3fd633cea81a7bf4ff2812aab5a55a06ef628ae2` augments the fixture with the collected Base Button styles. The original attach, reconnect and resource-release checks pass with the generated companion. The earlier missing-token rejection was reproduced on main and is preserved in the test reports. This change affects a single test file and preserves the production prototype, runtime and original assertions.

The same full WC non-browser selection of 159 files now reports **1,200 passing tests and 4 failures**, compared with 1,199 and 5 at the earlier #1497 head. The four remaining failures are the Switch Thumb inventory assertion, two animated border expectations, and the Dialog Mask admission order. No new browser run was needed for the fixture correction.

Two separate observations inform the remaining work. The existing Switch spec includes transform motion; testing that expectation reveals nine additional unresolved translation tokens rather than an empty inventory. The old Dialog Mask companion rejected `hidden` due to missing I1, after the lifecycle had already emitted `mount.mounted`. A diagnostic observer recorded zero listeners after disposal. Both exploratory changes were restored. The scope and raw report hashes are in the JSON.
