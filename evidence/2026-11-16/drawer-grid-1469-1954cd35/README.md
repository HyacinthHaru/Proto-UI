# Drawer root in an authored CSS Grid

This local Chromium comparison covers the layout condition reported in [Proto UI #1469](https://github.com/Proto-UI/Proto-UI/issues/1469). The source is upstream `1954cd3566b8f93e388352e282701dd086df2cdd`. The browser used Chrome for Testing 156.0.8078.79 on macOS arm64.

The fixture mounts the existing Base, Shadcn Rhea and Brutalist Drawer demos through the website renderer. It places the neutral Drawer Root directly inside a 2 × 2 Grid with four ordinary cells. The original Drawer Trigger is positioned out of flow in both variants. Shadcn retains its public Rhea style scope. The two fixture variants apply their CSS through the renderer's `surfaceStyle` channel.

| Root display | Root boxes | Grid rows | Grid height |
| ------------ | ---------: | --------: | ----------: |
| `block`      |          1 | 3 × 40 px |      136 px |
| `contents`   |          0 | 2 × 40 px |       88 px |

All 24 cases passed across WC, React, Vue 3 and Vue 2. Enter opened the real Drawer. Chromium exposed the named `dialog`, and the DOM label and description resolved. Focus started in the dialog and stayed inside after Tab. Escape closed it and returned focus to the original Trigger. The two images capture Base WC after Escape.

The first matrix attempt stopped after eight Base cases because the fixture looked one level too high for the Shadcn layout. The successful attempt retained the original Shadcn scope and placed the Grid inside it. Repository source and tests were clean throughout.

The comparison covers an authored neutral Root with an out-of-flow Trigger. An in-flow child can still participate in the Grid. The proof exercises Chromium and the website renderer's style channel. The attached runner makes the import relative to the repository root for reuse. The repository formatter formatted both attached scripts. `source-binding.json` records each executed and attached script hash.

Run the attached runner from the exact repository root with the installed project dependencies and pinned Chrome. Pass an absolute output directory that does not yet exist.

```sh
corepack pnpm@10.32.1 exec tsx /path/to/drawer-grid-native.mts /path/to/output all
```
