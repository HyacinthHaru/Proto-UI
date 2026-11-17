# S4 initial theme watches and virtual-row geometry

The first local commit batches initial theme watcher setup with a fresh scope read. It prepares that watcher before publication, so an initialization failure releases the staged renderer. The regression reproduces publication after the fault in all four runtimes on the previous candidate and passes on the new one.

The second local commit inserts and observes the complete virtual row window before measuring it. Generation checks continue around the DOM work and each measurement. The isolated Chrome control renders the same 32 keys in the same order with the same trailing space. Layout and style recalculation counts each change from 33 to 3 for first materialization with ResizeObserver disabled in both arms. The overlay controls in the full Matrix retain the original observer behavior.

The full-page diagnostic arms use the same HTML, theme batching and retained 1,268-preview, 60-second readiness and 150-second outer boundaries. With the virtual-row overlay, slow virtual-list rectangle reads captured by the hook fall from 102 to 11. Captured times fall from 3.538 seconds to 0.390 seconds. These are counts of reads at least 2.5 ms in separate executions. They do not establish whole-page time saved. Both full-page tests still reach the outer timeout before Dialog, and their last delivered readiness rows name Vue 2 Base Accordion.

The two candidates stay local. The exact combined source passes 86 scoped tests across seven files and workspace types. The receipts include the local source and diagnostic overlay bindings. The original static assets were restored.
