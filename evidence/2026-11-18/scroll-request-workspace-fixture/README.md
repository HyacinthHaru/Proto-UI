# Scroll request fixture workspace typing

The Scroll request fixture in #1490 traverses parsed or validated IR and checks the operation discriminator before retrieving a request. Under the workspace TypeScript configuration, its assertion from Record<string, unknown> produces TS2352. The assertion can use the same value after its existing object guard, consistently with the neighboring compiler fixture collector.

The prepared main control at `e4ea8d02d4a8befb746fa2c3730c052a3f8d0542` reports exactly that remaining error. The exact main-based candidate `0ff1bd2f7d67db5dfd725be49e92b753cceda0f0` passes the complete workspace type command and all 19 Scroll request outcome cases. It changes a single test line. The earlier emitted test control records the two distinct output hashes. Its only expression difference is [node] versus [value], and the unchanged declaration assigns node from value. The valid, malformed and forged request checks retain their original assertions.
