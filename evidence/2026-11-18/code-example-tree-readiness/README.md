# CodeExample Tree attachment readiness

The CodeExample client attaches a real Tree when each source host is first visited. The original profile test counted Tree elements immediately after a host switch. The test now waits for the real Tree attachment in the active panel and then keeps the exact count of one, its geometry and keyboard checks, all WIP checks and the existing 120-second case limit. Only the test changes.

The upstream hosted English 1440px light and dark cases failed at the immediate count. The local unchanged reproduction passed light and failed dark at the same assertion. A subsequent diagnostic variant passed both and did not capture a red sample. The separate native activation witness clicks the real WC tab on the English page in both themes. The correct panel becomes active with two native file tabs and no Tree at that checkpoint. Its single real Tree attaches 55.5ms later in light and 54.8ms later in dark.

The exact follow-up passes all 12 original localized CodeExample profiles and 38 focused preview fixture tests. Workspace types pass after generating the required style fixture locally. The browser uses byte-verified production HTML from a checkout with identical product inputs. The screenshot shows the passing English dark WC case at 1440px. The authored CodeExample blocks and resources remain intact.
