# Split surface concealment and decoration call provenance

This records the three review corrections in #1484 at `fe6a32f4`. After correcting the synthetic computed-style fixture, the same two regression files produced 5 failures and 104 passes on `15386f8c`, then 109 passes on the corrected source. Workspace types passed. The CLI build and the 39-package Web Component dependency closure passed.

The expanded CLI and Web Component selection recorded 427 passes and 25 failures across 18 files. Re-running the two failing suites on the clean parent reproduced all 25 failure names and normalized first messages. Those failures remain in the receipt.

The real Chrome 156.0.8078.79 probe showed that the previous code accepted equal reuse with CSS variables resolving to `display: none`, `visibility: hidden` or `content-visibility: hidden`. The fixed surface lease resolves these written declarations and rejects those cases. All 10 corrected cases retain the original caller slot assignment. The actual CLI-generated candidate artifact uses an anonymous default export and a conditional style handle, with 64px of Template padding measured in the 640px containing block. The recorded baseline uses its prior function-valued-helper artifact. The same browser probe ran against both.

Conditional result branches can supply the handle. The predicate itself keeps ordinary preflight. The inspected helper proof still requires the same verified synchronous call path. The draft lifecycle is unchanged.
