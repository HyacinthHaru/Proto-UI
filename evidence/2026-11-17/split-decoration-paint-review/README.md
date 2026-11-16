# Split decoration paint review

[PR #1484](https://github.com/Proto-UI/Proto-UI/pull/1484) at `bcbfd689aa6435e78a8c1e55923e3eca727b3df2` compares a reused split leaf against the latest paint applied by its Adapter sink. It rejects removal of the current token attribute and addition of an inline paint declaration. Both assertions failed on the preceding PR head. The corrected ownership and relocation selection passed 59 tests across five files. Workspace types and catalog authoring passed.

The real split host in a temporary Astro route retained the latest computed opacity of 1 after native F2 and a valid repeat commit. In two fresh browser contexts it then rejected the token removal or extra inline opacity, respectively, retaining the original caller input and reporting zero page errors. The corrected test and source inputs used for this verification match the signed commit.

The real alpha.1 to alpha.2 catalog diff reports `T-FEEDBACK-STYLE-OWNED-TARGET-0001` as revised.
