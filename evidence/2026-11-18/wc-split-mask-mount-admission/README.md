# Reject a failed Shadow Split Mask before publishing mounted

Signed main-based source `ab2afce5e22d083ae1913ffdab49c748599d1230` changes the Web Component adapter and the existing negative admission test. Applicable `D-WEB-COMPONENT-SHADOW-PROFILE-0001` and `D-FEEDBACK-STYLE-ROLE-RESOLUTION-0001-K` keep their draft status. This change restores failure handling at the existing admission boundary.

A diagnostic parent run captured the first Hidden/I1 projection failure immediately after `mount.commit.done`, inside the initial Feedback Rule publication. The adapter retained the error to finish the replacement transaction but forwarded the mounted phase and `mount.mounted` before the attach call returned. The adapter now checks that recorded error before forwarding the mounted phase or notifying focus readiness. Existing cleanup owns release of the failed view. The pending check is cleared with its view.

The same strengthened test fails on the parent and passes on the candidate. It retains the native admission failure, original commit diagnostic and cleanup assertions, and checks that the mounted phase is missing and the failure is specifically about `hidden` and the I1 recipe.

The bound source fixture and the public dist fixture use a real Dialog Root and Mask in pinned Chrome 156. Both fail on the parent and pass on the candidate. In both resolutions the valid companion emits mounted, subscribes once and returns to zero listeners after removal. The deliberately old companion is generated from the same CLI artifact with its I1 marker removed and base receipt recomputed. It emits one expected I1 error. The candidate skips both mounted notifications and releases styles, exposes, shadow children and the subscription. The native harness and per-input hashes are included. Each dist build completed all 41 packages in its declared dependency closure, with aliases disabled in the browser bundle.

Workspace types passed after generating the Website style asset. The 159-file WC non-browser selection records 1,176 passed and seven failing assertions plus the existing Node loader error in the receipt suite. The matched parent control had 1,175 passed and eight failing assertions plus that loader error. Only the Mask assertion changed result. The separate ViewEpochOwner suite passed 17 tests.

Scope covers admission of the tested composed Mask and the affected host lifecycle. Full S4 startup, H1 disputed width admission, Switch token inventory, independent review and upstream integration remain separate.
