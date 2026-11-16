# Split slot and scrollport review follow-ups

- [#1484](https://github.com/Proto-UI/Proto-UI/pull/1484) at `1ddddd9d68706d8411f94b44e53b205c6bd95121`: a split Root rejects reuse if an authored slot was renamed or moved within the same parent. The two new focused assertions reproduced on the previous head. On the corrected source, Chrome rejected both mutations independently and preserved the caller input. The exact corrected source and regression test hashes match the signed commit.
- [#1485](https://github.com/Proto-UI/Proto-UI/pull/1485) at `52c89701fec2a6afaa4cd341fafb707795901fc8`: the catalog diff reports both the decision and the test mapping as revised in `0.3.0-alpha.2`. This follow-up adds the two catalog entries.

The Chrome verification uses a temporary Astro route and the real split host. Full S4 startup and interaction acceptance are tracked separately.
