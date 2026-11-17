# Split surface paint, entry opacity and immutable style members

The three latest findings reproduce on exact #1484 head 9efd5cd7. Removed surface paint could still be acknowledged, admitted native entry opacity zero was treated as concealment, and a Template-only object-held style handle was sent through Root preflight.

Split reuse now verifies the current owned surface tokens and the current Root projection. This preserves real Rule updates, and both removed-token and removed-projection controls reject reuse. Native entry proof follows the admitted live enter tokens and first keyframe on the current surface. Exit proof keeps the matching last keyframe. Both animation paths retain the original caller slot in the Chrome controls.

CLI classification retains local constant object members only when the actual member read proves that initializer. A first candidate incorrectly accepted a member overwritten in a plain assignment. The final proof uses the existing lexical member resolver to catch that mutation. Opaque holder escape and shared Root use also retain preflight. The built CLI passes the immutable Template case and rejects the mutable member at the verified-length boundary.

The final targeted run passes 326 cases and workspace types. The 34-file broader run passes 757 cases with the same 25 baseline failure names and first messages. The signed combination builds all 47 packages with the retained scrollport patch. All three selected native review cases and original isolated Dialog Light, split and mixed pass. The first dist invocation used system Chrome 157. The pinned rerun matches the source runner on Chrome 156.
