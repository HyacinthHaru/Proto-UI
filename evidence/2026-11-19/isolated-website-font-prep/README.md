# Isolated website CJK font preparation

Exact signed candidate `7202738fbd0e0d32b2ff41d39a073bad32b6ccd7` on `009612b25e3ba425fc2f5016ae28a7309092f808`.

Four isolated website suites in scheduled run 44354089920 reached the existing five-minute setup timeout while installing the CJK font package. Their browser steps were skipped. The Homepage composition suite in the same run used the existing pinned helper, verified the selected font and Chinese glyphs, and passed its browser step. The helper bytes are identical between that run and this candidate.

All isolated suites restore the same exact package key and verify the same Ubuntu package before testing. The composition job remains the single cache writer. Existing dependency setup, font preparation, native browser and job budgets are retained.

Node 24 passed 23 Homepage contracts and 42 CI policy and release-ledger tests. The local mock fixture uses a size-query adapter for macOS. Hosted candidate acceptance remains pending.
