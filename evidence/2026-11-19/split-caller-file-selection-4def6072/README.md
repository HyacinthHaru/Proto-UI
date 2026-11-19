# Split Shadow caller file selection

The caller snapshot now records the original file sequence. Validation compares membership and order independently of the first synthetic input value. Rollback recreates a list from the captured File objects. In Chrome an assigned DataTransfer FileList can also mutate in place.

On 00f240c0b7fb15a8853af5ed8c654968cc768dd5, the real browser fixture loses the second file in both the replacement and in-place mutation controls. The unchanged control passes. On signed 4def607269ccf1f23e7bff1a807009908dd5d369, all three pass and the rejected publication restores the original File objects. The broader same-fixture comparison preserves the two existing text-selection failures and the integration comparison preserves both prior text rollback failures.

The local signed composition 90888187757b5f9913309c27c790c4bc2c3e1c4b includes the existing split decoration and priority Previewer changes. It builds 47 packages and 685 pages and passes workspace types. The two original S4 cases retain 1,268 previewers each and their original deadlines. The exact locale outcomes and browser error totals are in the verification receipt.
