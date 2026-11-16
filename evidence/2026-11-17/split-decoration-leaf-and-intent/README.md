# Split decoration leaf layout and referenced Rule intent review

Five focused cases reproduced failures on #1484 at `d94a6e0a`. All 127 focused cases pass on the signed revision `0ab97d07`. Workspace types passed. The expanded 738-case selection produced 713 passes and the same 25 failures, names and first messages as the exact parent receipt.

The open-split guard checks the leaf and its authored wrapper path for computed layout hiding. In Chrome, a stylesheet's display rule removed the leaf's layout box on the parent while equal update succeeded. The fix rejects both direct and wrapper-based layout removal. The caller slot stays assigned, and an opacity-zero leaf retains its layout and can still be reused. The CLI follows the existing lexical/source provenance for named, const-bound, and shorthand Rule intent references. It requires every inspected reference to describe the same verified setup owner and rejects the escape control. With an actual generated artifact, the referenced Rule's 10% Template paint measured 64px in a 640px containing block.

The isolated source and public dist Dialog journeys passed on the signed local composition. It built 47 public packages and preserved the original Light, split and mixed interactions. Full matrix startup and hosted acceptance remain open.
