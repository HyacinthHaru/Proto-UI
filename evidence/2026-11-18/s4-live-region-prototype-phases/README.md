# S4 Bootstrap Live Region startup phases

The two Chinese runs use the same signed 8f0025d1 production build with all 1,268 preview roots, pinned Chrome, and the original 60-second readiness and 150-second case limits. Diagnostic taps were applied only to emitted assets and the existing console stream allowlist. Every changed byte was restored after each run. Both runs reached the original readiness timeout with the English case filtered.

In the first run the recipe and shared asset finished receiving by 29.9499s. The recipe module body began at 39.5203s and finished about 0.1ms later. The WC path awaited its two prototypes from 39.5223s to 51.4856s, rendered its first child about 14ms after that, and published at 52.9393s. The other three runtimes also published in this run.

The second run followed the actual prototype loader calls. Bootstrap Button finished and registered by 10.9877s. The Live Region root bundle finished receiving at 45.4179s. The root module began executing at 59.9076s and registered by 59.9078s. The other mapped resources had completed earlier in this run. WC returned from render at 59.9232s and recorded publication at 61.5025s. The sampled predicate stream was bounded and last reported an earlier missing owner.

Timing is reported within each run. A separate local Agent Operations test worker was live during the second run. These phases support investigation of post-delivery execution and scheduling, with browser resource responseEnd kept distinct from callback delivery and from entry-module execution.
