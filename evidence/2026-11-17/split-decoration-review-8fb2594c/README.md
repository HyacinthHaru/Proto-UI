# Split decoration reuse review follow-up

The three focused cases failed before the fix at the old reuse boundary. The signed candidate requires the owner-lived split surface to remain a child of its ShadowRoot during commit and reuse. Template-authored text keeps its node identity and literal payload in the physical record. The caller slot continues to own its own content.

All 49 focused tests passed, with workspace types and two changed catalog inputs. Chrome confirmed a valid reuse with a retained focused caller input, followed by explicit rejection after each independent mutation: moving the surface to another connected same-document element, removing Template text or editing its payload. All three leave the caller input and its value in the host. The Draft contract records the split admission under its alpha.2 revision.
