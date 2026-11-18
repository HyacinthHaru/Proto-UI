# Preserve Anatomy order reads while a target is unavailable

Exact follow-up 4a1e06dab2fb8a10f398198e1d41e85f1b2eece2 on previous PR head 34ea3c64c713d367118d077383c1df3e226e4b6f. The reviewer’s fixture holds a supported root target unavailable with twelve mounted subscribers. The earlier PR head reads the shared logical ancestor twelve times. This revision reads it once.

The host observer disposer and new registration retain a cache invalidation before invoking their host callbacks. The synchronous observer reparenting case still observes the later subscriber in its current domain and avoids advancing its version twice.

All sixteen focused Runtime contract cases, 488 related tests and 34 selected packed browser cases pass. Header first-frame checks pass at 320 and 390 pixels.
