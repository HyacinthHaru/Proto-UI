# Feedback projection during terminal disposal

Exact signed candidate `adc1185cbd26791995cdd9b89a2aece91a16f599` on `bcc9dd4b75e410cf858886a7058f4ec21c9cae1b`.

The original Rule Runtime catalog assertion fails on the parent. The Rule driver retires its contribution while the instance is disposing and the physical view is still mounted. Feedback then publishes the remaining `text-white` Root style once more. The candidate checks the current instance phase in the existing projection guard.

The exact candidate passed 1,142 Feedback, Rule and Runtime checks. Three files were skipped and 34 cases remained TODO. All 47 public packages built. Workspace types, manifests and the Finf budget check completed.

Chrome for Testing 156.0.8078.79 exercised the public Runtime in four controlled runs. Source and built-entry baseline each wrote Root style once during disposal. Source and built-entry candidate each recorded zero terminal writes. Mounted decoration, the authored unmounted callback and disposed-State behavior remained observable in all four runs. The test host records style writes through its Effects capability and uses a real DOM decoration. Follow the attached probe for the fixture and exact bundle inputs.

The executed script is preserved as `native-terminal-projection.mjs.txt`. Copy it to `native-terminal-projection.mjs` when replaying.
