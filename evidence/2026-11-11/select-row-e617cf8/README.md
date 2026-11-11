# Item-aligned Select verification

[PR #1434](https://github.com/Proto-UI/Proto-UI/pull/1434) head `e617cf8a89aa1fafe9f7e80e62766114e15bf867` passed all **24 original native cases**. The run covered English and Chinese across WC, React, Vue and Vue 2 in default, RTL and reduced-motion environments. The matched row and Trigger remained within the original 0.5px tolerance on all four edges. The first enabled row remained unselected before commitment. Subsequent phases used the unique selected enabled row.

The preceding head passed 16 cases and reached eight RTL failures. The article wrapper still explicitly used the locale LTR direction after the test changed the document direction. This revision supplies the same direction to the document and enclosing article, then verifies the actual native Trigger direction before keyboard input. Two unmodified frames and their exact observations appear here. The full type command on the same signed head passed 1,214 Astro files with zero errors and zero warnings.

AI assistance: Codex.
