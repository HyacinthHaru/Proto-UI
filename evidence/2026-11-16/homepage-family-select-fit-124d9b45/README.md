# Shadcn Homepage family Select

- Signed product head `124d9b4582f64b419420baefa5d56875ea1725ac`, tree `f769c5b2e1e2b456e2c7c2988202e37a0e0b4240`, parent `f69d5969414b4e22c7748c7c8cfdc5ff2218667c`.
- Clean parent reproduced `select.geometry.size-conflict` before the original four-Runtime/two-lane matrix could open the family menu. A separate observer found 132×44px row boxes and 142px scroll width for the complete WIP row. This is the measured input to the CSS change.
- The signed candidate was exercised on the actual Chinese Homepage with Chrome for Testing 156.0.8078.79. The native family combobox was clicked at each viewport and its existing ARIA-controlled listbox supplied the named options. [Measurements](receipt.json) contain all three row boxes and widths per viewport.
- [1279px](shadcn-family-1279.png), [1280px](shadcn-family-1280.png), [1440px](shadcn-family-1440.png). At the two wider viewports each row is 149×44px, the longer label wraps and stays readable, and the right-side Header controls remain visible.
- On the candidate CSS, the original matrix and compact 200%-text/RTL case passed. The separate React family Select desktop reconnect exceeded its original assertion and test deadlines on both clean parent and candidate. That failure remains open.
