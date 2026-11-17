# S4 publication theme batch execution

This follow-up adds batch and completed appearance counters to the previously recorded local candidate overlay. It keeps the same Matrix document, CSSOM sampling hook and original 1,268-preview readiness predicate. The candidate code stays local.

The browser delivered three complete batch records for 3, 16 and 104 scopes. It recorded 123 theme snapshots in total. The 104-scope batch completed in 16.7 ms. It also delivered an appearance completion milestone at 64. Completion milestones are sampled at powers of two, so 64 is a witnessed lower bound rather than a total.

This run verifies that the batched read path executed and released appearance writes. The original whole-page test still failed before Dialog. Its readiness limit and outer timeout were unchanged. The counter-only overlay was restored.
