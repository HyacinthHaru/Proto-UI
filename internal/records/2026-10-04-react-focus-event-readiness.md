# React native Focus ingress readiness

Bounded regression candidate discovered by the PR #775 contrast audit. This record is not a new protocol, lifecycle admission or native acceptance result.

## Evidence

The exact `bf0fcf27` native audit (Actions `37226828131`) preserves two failed React Select End observations. `document.activeElement` is the real Paper item, but the same runtime Focus Center reports `focused: false` and `hasFocused: false` for it. The active listbox scope and its ordered Paper/Ink members are correct. Therefore the existing `requireFocusedMember` guard cannot admit End navigation. WC, Vue and Vue2 complete the same original keyboard and added pointer journeys; all four Dropdown runtimes pass. No failed case is omitted.

Separate real React 18.3.1 and 19.2.6 happy-dom compounds did not reproduce that native state divergence. They do not substitute for the preserved browser run.

## Existing authority and bounded repair

Draft `C-AS-FOCUSABLE-0001-G` requires a host to withhold a target that is not focus-ready and preserve a pending request rather than claim application. `focusSelf` deliberately relies on observed host focus events for its facts. React's earlier effects-ready boundary can expose the connected target while host-event ingress is still gated. The controlled capability regression is red on main `d05d1a00`: it returns the target in that state instead of null.

The adapter's private Focus target getter additionally requires its existing view-ready state and enabled event gate. Accessibility and style projection keep the earlier effects-ready boundary. The existing ready notification then replays pending native focus after ingress is available. No new public option, Host Capability, synthetic focus event, forced blur/refocus, timeout, portable state or semantics is added.

## Validation and remaining work

The temporal capability negative turned green; it also checks ordinary ready, effects-not-ready and disconnected targets, and proves accessibility still projects its role/name while Focus waits. Twenty-eight focused React Focus/Select/catalog/retained-lifecycle tests and narrow TypeScript pass. The earlier invalid test-label snapshot was corrected to the actual typed A11y text-alternative API before this candidate was committed.

Native validation must combine this independent production candidate with the unchanged exact-head #775 audit; only that subsequent actual run can establish whether it closes the observed Select divergence. Independent review and full CI remain required. No main merge, release or production deployment is implied.
