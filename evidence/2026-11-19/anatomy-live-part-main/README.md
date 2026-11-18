# Live Anatomy part ancestry

Exact signed head `b3a865e962644cc0611a5d9c056b1766a9e060c0` on `e14b3c6adc02f4d614295f2648dee89c1bfbf2fd`.

A direct membership or ancestor lookup resolves the published part's current claim and the requesting domain's logical root. It only reads the relevant ancestry. It still resolves the current root after an actual move and rejects a retired claim that is physically nested.

Chrome for Testing 156.0.8078.79 ran four source-bound parent and candidate controls over real DOM ancestry with the same injectable Anatomy host capabilities. The initial lookup reads the unrelated sibling domain on the parent. The candidate limits reads to the relevant chains. Both arms correctly observe a real move, verify the new ancestor and reject the retired claim.

The matched test fixture failed once on the exact parent. The candidate passed 385 Anatomy, A11y and Scroll tests. All 47 packages built, with workspace types and manifests passing and the existing Finf budget check retained.
