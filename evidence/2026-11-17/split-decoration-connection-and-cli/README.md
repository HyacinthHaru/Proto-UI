# Split connection, surface identity and CLI token verification

[PR #1484](https://github.com/Proto-UI/Proto-UI/pull/1484) at `44489203fac531ff52d04ecf46545c393c2bcd97` addresses pre-acknowledgement connection reactions, retained surface identity and compile-time placement of canonical owned-decoration tokens.

- The Adapter captures immutable split Template shape in staging and checks the live result before acknowledging it. The same check guards reuse, including the surface's stable selector and visibility attributes.
- The CLI treats proven canonical direct owned-decoration paint as Template CSS, retaining Root preflight for independent Root use and rebound lookalike receivers. Both setup and Rule intent paths are covered.
- The same 62 test cases produced 8 failures against the preceding exact head and all passed with the two corrections. The wider selection passed 252 in 9 files before the final Element type narrowing. Afterward, the 65 Adapter tests passed again, workspace types passed, and the CLI and WC package entry builds completed. The CLI inputs are unchanged from the wider suite.
- Chrome 156 verified six independent physical corruption cases on the final input hashes. The inner leaf evaluated the actual CLI-generated `p-[10%]` CSS to 64 px in a 640 px layout. The valid repeat commit retained caller focus and slot assignment. Each unsafe mutation was rejected, including two native custom-element connection reactions.
