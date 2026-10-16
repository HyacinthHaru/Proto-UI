# Material Contact (experimental, unregistered)

This private module implements `C-MATERIAL-CONTACT-0001`'s finite bilateral association and current-lifetime checks. Only standalone fake-host tests exist. It is not registered in the production Runtime, has no author hook or real Adapter provider, and does not change the existing material sink or optics.

- Setup-only `offer`/`receive` use the four Core declaration types.
- Anatomy supplies current family/domain/part facts; this module owns its own bounded registry. Missing or duplicate endpoints never choose a first match.
- The receiving part must have a declared material slot. Views must be current, share one document and match the exact input owner's immutable registration.
- Self, Switch Root-to-eventless-Thumb and Slider Track-to-Thumb fake fixtures retain their independent input/value/focus responsibilities.
- Held contact before attachment is not replayed. New observation needs a fresh pending session. Old epochs, stale revisions and cancelled sessions are inert across paint-only reattachment. Malformed, mismatched or mutated registrations require a fresh reader; repairing one in place never restores its authority.
- Samples stay inside the privileged module/host capability. No capture, activation, click suppression or value operation is exposed or invoked.

The first slice requires the endpoints to use the same trusted host-capability object. A future shared provider can deliberately supply that identity; arbitrary objects, TypeScript brands and material declarations do not authorize it.

Host handshake is a readiness fence. Contact already present during initial subscription, including synchronous subscription callbacks, is treated as old; the receiver waits for a subsequent fresh pending session. This conservative rule avoids reviving a held contact while view/resource binding is incomplete.

Still required: production Runtime assembly by its owner; actual input reader and router/recognizer handover; style-owned moving geometry; complete current backdrop including real tracks; placement-exact asynchronous paint; preference and foreign-paint integration; four Web/native/Compiler evidence. An attached fake lease is not optical support, and continuous fallback is not completed Liquid Glass interaction.

Run focused tests with the repository Vitest configuration, then workspace TypeScript checks (which also compile Core negative type fixtures). Catalog entities remain draft, with the production optical case explicitly planned.
