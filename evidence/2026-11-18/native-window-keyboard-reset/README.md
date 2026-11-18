# Shared native Window keyboard-owner reset

Routers that bind directly to the same native Window share the private capture reset for keyboard ownership. The last router releases that listener. Existing semantic and authored native handler order is exercised in the controls.

Each source-bound Chrome comparison uses four fresh contexts with parent/candidate/candidate/parent builds and only the router implementation substituted. CDP reports four/three/three/four Window keydown capture listeners, including two authored native probes. After disposing the first and last routers, all runs report three then two listeners respectively. The trusted Enter traces and synchronous reuse of one programmatic Event retain both native probe order and the correct first or second Portal owner.

The rebindable bridge control uses trusted input and real document adoption into an iframe. Listener counts are queried in each frame's own CDP execution context. The native capture counts begin at two in the original Window and zero in the destination. Rebinding the first router leaves one in each Window. Disposing the other router then the moved router retires each binding. The original and rebinding key presses reach the corresponding owner in all three actions.

On the exact integrated 56aae189 census, one native reset installation serves 8,704 acquisitions by the delivered page 59.8522s checkpoint. The original Chinese S4 case reaches the 60-second readiness timeout with 1,268 previews and the original 150-second case limit. The English case is filtered. The census records page time and Node receipt time and uses the original predicate.

The exact integration passes 67 targeted tests and the main-based 4d6e0453 candidate passes 66, each across 13 files. The integration includes the separate contextmenu ownership regression from #1506. Both builds pass 47 packages, 685 Website pages, workspace types and manifests, and the package-budget command with the existing ceilings. Both pass 15 selected original browser cases with nine filtered, the Header first-frame checks at 320px and 390px, and all nine CodeExample blocks.
