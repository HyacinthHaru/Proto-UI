# Read back acknowledged pull requests directly

During the actual creation of PR #1508, GitHub returned a numbered PR with its exact body and head. The subsequent two-page author list still contained no matching body. An independent read by PR number then confirmed the returned ID, exact body, title, author, source and base. One creation request was sent.

The follow-up reads the acknowledged PR number directly after the creation request succeeds. It keeps the existing duplicate search before writing. During a lost or invalid acknowledgement the existing reconciliation still reports the outcome as unknown. A different body on readback still reports an unknown outcome after exactly one write attempt.

The read-only replay restores the observed stale author list and substitutes the live exact PR response for the creation acknowledgement. The preceding implementation reports an unknown outcome. The follow-up validates the PR by number. Each arm intercepted one simulated creation request and performed zero external writes. The exact candidate passed all 62 publisher tests, all 1,549 agent-operations tests and the Agent documentation check.
