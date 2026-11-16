# S4 renderer sampling after Bootstrap Dialog repair

The diagnostic uses signed candidate `14be33a0a367f478f78de13ca40ca666b460cac9` from [#1483](https://github.com/Proto-UI/Proto-UI/pull/1483) and the attached observation patch. It runs the original Chinese S4 case with its 60-second startup wait and 150-second outer test limit. The Chinese case timed out before the native journey. The English case was unselected. The same run recorded zero Bootstrap Dialog recipe closure errors.

The browser trace began on the Node receipt of the request for `react.js` and retains a roughly 50-second window. The trace setup observer reached its 8-second bound. The browser acknowledged the original tracing command at 10.044 seconds and the subsequent stream reached EOF with zero reported backend data loss.

- Two URL-keyed Chrome renderer streaming tasks and finish callbacks locate both tracked React transitive chunks in the renderer. The background task durations were 0.892 ms and 5.628 ms. The Node listener did not receive either chunk's finish event and the page did not deliver either Resource Timing entry during the original case.
- The same renderer's main thread recorded five `v8.evaluateModule` events after the second streaming finish callback. The first followed it by 59.828 ms. These events carry a world ID and lack a module URL. Three package import factories were observed, and their settlement callbacks were unobserved by the terminal case. The two wrapper imports settled.
- All 18 recorded page errors share the stack from Shadcn Tabs Trigger setup through the Web Component adapter into `declareDecoration`. Current source shows the three original Shadow consumers place those decorated Triggers in 8 S3, 8 nested S4 and 2 S5 split hosts. That count is a source inventory. The error stack itself supplies the adapter and Prototype identity.

The compact receipt records normalized timing and stack rows, the exact tested source identity, and the local trace hash. The raw Chrome trace is retained locally because it includes browser process metadata. The next unresolved boundary is URL or module identity at evaluation and the import Promise continuation.
