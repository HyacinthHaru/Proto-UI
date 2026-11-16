# Split Root paint, caller acknowledgement and lexical factory review

Five focused cases reproduce failures on #1484 at . The signed revision passes all 132 focused cases and workspace types. The expanded selection has 718 passes and the same 25 source-scanner failures, names and first messages as the parent receipt.

The Chrome control distinguishes Adapter-owned Root opacity from a later external stylesheet. The old guard already rejects publication for the owned zero-opacity fixture. With the fix, that fixture publishes, accepts equal update and keeps the native slot when the caller changes from A to B. The external stylesheet still rejects equal update. The two connection reactions that remove or replace caller content now reject before acknowledgement. The initial baseline probe expected a published slot. The corrected probe captures the missing publication and all four cases.

The CLI uses the existing lexical Core factory resolver for decoration and Template classification. A nested same-name local factory and an alias to a different Core factory both retain Root preflight. The original split Dialog sequence also passes on the isolated source and public dist fixtures in the signed local composition. It builds 47 public packages and keeps all original Light, split and mixed interactions. Full matrix startup remains open.
