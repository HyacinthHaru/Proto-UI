# S4 shared Base Accordion module boundary

The same 1,268-preview static Matrix, theme/row control and early runtime calls remain in both probes. The original 60-second readiness and 150-second outer limits remain in force. The second probe only calls the same shared Accordion module earlier. This is a diagnostic overlay, and the test and generated assets were restored.

With normal dispatch, Base Button imports and registers. Five Accordion member loaders dispatch through the same emitted module at about 12.67 seconds. Chrome reports the shared request and a loading-finished event. None of the five loader promises returns before the original readiness timeout. The last original readiness row names WC Base Accordion.

The early-module probe reports the shared import returning at 12.22 seconds and the five registrations returning near 31.32 seconds. The Vue 2 Base Accordion then leaves the runtime join, mounts and crosses its paint wait. Its surface-ready marker is at 31.99 seconds. Publication is still unobserved and the original readiness check times out before Dialog. The final original readiness owner is unavailable in this arm.

This result isolates the shared import wait in one observed run and confirms that the later Vue 2 owner can mount in the control. The next boundary to instrument is post-ready appearance and watcher publication. The control does not establish a general preload policy or a whole-page speedup.
