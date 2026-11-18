# Coverage matrix controls on current main and integration

The original check:coverage-matrices command was executed on clean prepared main `cbca317199e8e5f4d33cc2b4451486b7fc48a98f` and on the contributor combination `e22bf83c112a4c5b73387c33908bf19e8a751ad1` after adopting #1513. The complete tool outputs are hashed in the receipt. Each count compares the original issue lines with multiplicity.

Main reports 1,153 issues. The contributor combination reports 1,169 issues. The two runs have 1,144 issues in common, nine found only in the main control, and 25 found only in the combination. The receipt preserves both difference lists. The combination-only differences consist of 21 Feedback import edges, two reviewed Previewer fingerprints and two missing Previewer-removal bindings.

Both full commands stop at the coverage validator. A separate execution of the checker test file on the integration reports 2,102 passing and 187 failing cases. Three selected matching failures also reproduce on clean main. The receipt retains the exact selected case names and both log hashes.

The local integration also records the approved #1517 merge with an identical tree. These local coverage merges are separate from the published and browser-verified subscriber-cursor revision.
