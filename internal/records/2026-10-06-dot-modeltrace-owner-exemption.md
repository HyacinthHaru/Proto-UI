# Owner-authorized dot ModelTrace exception

## Decision and scope

On 2026-10-06 the owner explicitly exempted dot from ModelTrace measurement, required dot to identify itself clearly, and requested persistence in Skills. This record paraphrases that current instruction; it does not publish the private conversation. The change does not claim a measured backend identity and does not change another Agent's fingerprint requirement.

The previous rule unconditionally required a measured record for every Agent write, including a current owner-directed dot task. The bounded correction replaces only dot's ModelTrace-specific prerequisites with a visible not-measured role declaration. No inferred permission or fingerprint may be manufactured from the `dot` label. Existing action authorization, authenticated account/permission, exact branch/head/tree, DCO, CI, independent review and repository rules remain independent gates.

## Implementation

`dot-exemption.mjs` contains a fixed owner-exemption identifier and plain-language disclosure, not a ModelTrace receipt/schema. Publisher parsing accepts exactly `--agent dot --dot-exemption owner-authorized-2026-10-06`, mutually exclusive with measured record/context arguments. It uses all existing operation-specific preflight, mutation and readback logic. Markdown disclosure is placed first so earlier fenced/quoted/raw-HTML content cannot hide it. New commit environment fields and the existing commit-message hook require the same exact declaration. Git's normal DCO trailer remains verified against the actual committed object and authorized tree.

The default non-dot path is unchanged. Unknown/partial/duplicate/conflicting exemption inputs fail before artifact reads or IO. Current-user and owner-delegation authorization parsing remains separate; dot cannot create its own action permission. Human/non-LLM commits retain the previous behavior.

All nine Skills that mention ModelTrace, plus AGENTS and the contributor guide, now state the same narrow exception. A real connected GitHub service is an allowed transport when it can collect the same live account/target/provenance state, preserve canonical disclosure and exact-head/CAS bindings, and read back the result. A missing local `gh` login is not a request to copy credentials or connect again. Canned fixture data is never production evidence.

This bounded update does not retrofit the record-specific `agent:review`/`agent:collaborate` CLIs or ModelTrace handoff validators. The guide explicitly identifies their limitation for dot: retain the same non-ModelTrace requirements using the real connected-service path, never invent a measured artifact or claim an unsupported validator passed. Non-dot CLI and handoff behavior stays intact. No generic identity or transport framework is added.

## Verification

`node --test scripts/agent-operations/test/dot-exemption.test.mjs` exercises 28 cases without creating or scoring ModelTrace samples. Cases include unknown/missing/duplicate/mixed arguments, unchanged measured-input requirements, hidden/fake disclosures, hook behavior, current target/actor drift, one-write/readback/idempotency, uncertain-write non-retry, and an actual temporary Git commit with the real hook, exact parent/tree and own DCO sign-off. Transport responses in those tests are explicitly synthetic unit fixtures, not current repository publication evidence.

The first real-commit test exposed Git inserting a blank line before DCO when the disclosure ends in plain prose. The candidate now checks that exact resulting message instead of accepting an arbitrary message shape. That failed run remains part of the implementation history; it did not perform an external mutation.

Eight existing publisher declaration/expiry/hook controls and forty existing Skill-registry/owner-authorization controls also pass. Parser-only fixtures now use their existing failed-probe option because they do not need to score synthetic samples; the measured-path expectations are unchanged. The first governance run found a local missing root dependency link after updating to main; restoring the declared Markdown dependencies from the already-installed registry packages resolved that environment failure. Agent operations, contributor-Skill/schema projection, formatting and diff checks accompany the focused tests. Existing ModelTrace scoring suites were not run for this task; the vendored scorer and bank are unmodified. This is functional policy evidence, not authentication, independent acceptance or proof of current GitHub permission. Exact-head repository CI and independent review remain separate publication gates.

## Review reconciliation

Automated review identified two real omissions. The provenance policy, operations README and both public languages of the Agent/Skill guides still gave unconditional measured-only instructions; they now state the same dot exception and exact alternative flags while leaving non-exempt instructions intact. The first Markdown recognizer also treated raw lines inside quoted evidence, and ordinary `Agent: browser` task prose, as identity declarations. It now identifies only rendered, root-level standalone declaration paragraphs through the existing Markdown/HTML parser dependencies. Examples remain body content, cannot supply identity, and cannot cause a false duplicate; multiple visible declarations and malformed visible blocks still fail. No scorer, permission, target or mutation mechanism changes.

Two source-bound controls reproduce the old head's rejection of an ordinary Agent field and fenced disclosure example, then pass through the corrected recognizer. The updated focused suite has 31 cases; the existing publisher/expiry/hook controls (8), Skill/owner controls (40), and public-document controls (26) pass, for 105 executed checks. A first public-doc run lacked this isolated checkout's Astro dependency link; using its already installed declared workspace dependencies resolved that environment failure without a dependency or lockfile change.
