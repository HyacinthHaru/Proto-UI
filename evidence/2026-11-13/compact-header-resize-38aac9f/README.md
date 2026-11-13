# Compact Header resize ownership

On exact `38aac9f`, a compact Button-only ResizeObserver delivery does not remeasure the Header rectangle. The paired real controller fixture observes one read before and zero after. A combined Button and actual Header resize still measures the Header exactly once and moves the panel from the old 61px top to the original expected 105px top. Desktop continues to measure from its actual anchor. Viewport and scroll handling remain.

The clean exact candidate passed 83 focused and 14 original Chromium cases, including the two named Contents/mobile cases, both compact 200%/RTL cases, both breakpoint reconnects and Dialog 8/8. The original local Brutalist poll passed at 555.003ms, with the original narrow WC shadow, ring and clipping checks passed. Both supplied images are from the actual passing journeys and were inspected. All CodeExamples, original assertions and deadlines remain. Hosted outcomes are separate.
