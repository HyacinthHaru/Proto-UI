# Liquid Glass projection (draft)

The draft family declares explicit V2 optical intent. The optional Web provider renders the fixed audited liquidGL kernel over a visible application-owned canvas source. This is not arbitrary DOM capture or Apple-native equivalence; group/morph and the broader material goal remain open under #793.

This private, unreleased source package projects Base Button into a functional-control visual language informed by Apple's [Materials HIG](https://developer.apple.com/design/human-interface-guidelines/materials). It is independently implemented, not Apple's native material engine or an Apple-endorsed library. No Apple font, icon, private asset or shader is redistributed.

`liquid-glass-button` genuinely invokes `asButton()` once. Base owns activation, keyboard, focus and disabled behavior. Visual props:

- `variant: regular | prominent`, default `regular`
- `material: auto | opaque`, default `auto`
- inherited `disabled`, default `false`

## V2 material and source ownership

Regular auto Button requests one complete `liquid-glass` candidate and consumes Base press state. Surface supports static optical candidates independently of Button. Final opaque fill and foreground tokens remain the designated fallback; the host resolves their palette provenance after Rule/runtime patches. Neither Prototype contains browser observers, shader fields or GPU uniforms.

An opt-in consumer imports `@proto.ui/adapter-base/web-material` and passes its `createVisualSink` factory to the chosen Web Adapter. It supplies a revocable visible canvas lease and an explicit current palette. The same provider works through Web Components, React, Vue and Vue 2; asynchronous framework style delivery must be observed before publishing optics. A provider-free Adapter retains ordinary opaque source style.

The website Previewer lazily installs this provider only for Liquid Glass content. Its moving canvas is the real background plane and its pixel source. Source revision, geometry, scroll/resize/DPR, theme, preferences and view retirement are revalidated. Overlapping content, painted ancestors, cross-scope portals, unsupported compositing and unknown provenance reject sampling. This does not promise a screenshot of arbitrary page content.

Reduced/unknown motion selects static optics. Reduced/unknown transparency, unsafe contrast, source loss and GPU failure withdraw enhancement. The explicit opaque and prominent choices retain their safe presentation. Unsupported transparent fallback does not become a fake opaque material: ordinary legal style remains intact.

## Entry points and evidence

- `src/button`, `src/select`, `src/text` and the package root are genuine source exports
- `src/theme` owns light/dark values and the theme renderer
- `/en/ui-libraries/liquid-glass/` and `/zh-cn/ui-libraries/liquid-glass/` register the implemented family parts, including Select and Text, with operable four-runtime documentation demos
- `/en/test/liquid-glass-material/` is the exact-source real-Web material fixture; its negative controls compare decoded optical press/rest pixels and revoke the visible source or insert unrepresented overlapping content
- `/en/test/new-projection-families/` deliberately sets `material: opaque` to retain explicit fallback evidence

The full family remains incomplete (#792). The partial manifest rejects missing kinds instead of aliasing another family. Homepage-wide selection awaits the real parts/compositions its gallery needs. General Compiler admission remains #732/#733. GPUI requires the real root Feedback transaction path in #719 plus native paint/input/focus/a11y evidence; #798's token data alone is insufficient. Flutter/Qt need actual backends. Native effects remain explicit gaps, not silently dropped success.

Current new material browser evidence is planned until the combined exact-head Actions fixture has run and its actual captures have been inspected. Existing Button fallback evidence is retained separately.

Select Root/Trigger/Value/Content/Item and Text now have independent direct Base consumers and private `/select` and `/text` source exports, including source-only four-Web CLI facades. Real Select and Text provide the family toolbar. Select Trigger/Content consume shared explicit liquid-glass material intent and complete opaque fallback; the optional provider realizes supported owned-source optics, while exact-head optical/native paint acceptance remains pending. Text retains all eight Base axes and inherits the owning context’s selection policy.

## Field (draft workspace source)

The `./field` subpath exports `fieldRoot`, `fieldLabel`, `fieldControl`, `fieldDescription`, `fieldError` and `fieldValidity`. Root owns validation and consumer-owned async request leases; the default Control owns one host text editor. All six atoms share the same Base protocol, including controlled validity, required/length checks, disabled/readOnly, exact label/help/error relationships and stale-result rejection.

This is not Fieldset/Form or form submission. Native TextControl transport, OS accessibility, browser screenshots and optical/GPUI evidence remain separate gates. Package source and synthetic-DOM tests do not imply stable release admission.

### Held pointer contact (draft Web slice)

The enabled regular Button requests finite `contact: pointer` visual feedback. The existing Web input router owns the sampled primary-pointer session; the renderer does not capture pointers or emit activation. Contact coordinates use the undeformed down bounds, and visual dragging can continue after pointer leave without changing Base activation semantics. Disabled/opaque/prominent withdraw the request. This source slice does not establish browser GPU smoothness, arbitrary DOM capture, native host support, or Apple-private equivalence. Reduced motion retains static feedback and disables elastic motion.

## Local draft artifacts

`pnpm run build:draft` refreshes the public prerequisite `dist` trees in the workspace through the normal package compiler, then builds and stages the existing draft entries and dependency closure in a fresh temporary directory. `pnpm run pack:draft` additionally produces local tarballs. The JSON receipt identifies every artifact and its draft-only status. Both commands run from this package directory.

These are private, release-excluded development artifacts, not public package admission or a registry publication. The checked-in source exports and public CLI rejection remain unchanged. The temporary manifests use `0.0.0-draft`, retain `private: true`, omit lifecycle scripts and bind workspace dependencies to the same local draft version. Install the complete returned tarball closure together with scripts disabled and offline resolution; no artifact should be uploaded to npm. Build/pack success alone does not establish consumer, host, visual, native, or full Finf G4 acceptance.

Run `pnpm test:draft-packages` from the repository root for the complete offline tarball install, JavaScript ESM and strict NodeNext declaration smoke. Run this build-bearing suite separately from other package builds.

The draft builder admits only the two named prototype families and their current dependency shape. It is not a general private-package build API; adding workspace dependencies that occur only in peer or optional fields requires extending and testing its closure planning first.

## Standalone Toggle (Proto extension)

`liquidGlassToggle` / `./toggle` inherits `asToggle()` once: Base owns `active`, `defaultActive`, `disabled`, `activeChange`, focus and activation. The only added prop is `material: auto | opaque` (default `auto`). It is a button-style Toggle (`role=button`, `aria-pressed`), informed by Apple's [button Toggle style](https://developer.apple.com/documentation/swiftui/togglestyle/button), rather than a sliding switch.

Inactive retains the secondary palette and regular optics. Active selects the governed primary fill and primary foreground together, and its complete regular material candidate opts into finite `tint: 'style-fill'`. The shared policy requires explicit provider capability; an unsupported provider uses the same selected opaque palette. The first-party host bounds the sampled source and all lighting within the fallback pair's luminance contrast limit. This is an independent host profile, not an Apple recipe or native shader equivalence. No arbitrary CSS color or shader parameter enters the portable material API, and omitted tint retains the historical neutral profile.

Selection uses a small decorative `currentColor` check in a permanently reserved trailing slot, without imposing underline. Only the glyph opacity changes, so text and icon-only content keep the same layout in both states. The check is noninteractive and hidden from the accessibility tree; icon-only consumers still need an explicit accessible name. The shared prototype now provides this visual marker, while native visual and compiler coverage remain unverified. The check is a Proto design choice, not an Apple-mandated symbol or a mapping of Apple’s Differentiate Without Color setting. Focus retains its own ring and forced-colors outline; disabled selected controls retain the check. Transient `pressed` changes the existing deformation phase; reduced motion retains static selected tint. Opaque or disabled withdraws the candidate without whole-control opacity. Forced colors retain UA color ownership. Shared source, provenance, transparency, contrast and provider gates remain in force, and legacy neutral first-paint seeds cannot substitute for tinted paint. No Surface wrapper or Toggle Group alias is involved.

The new selected visual contract retains the eleven public browser scenarios and adds receipt-bound interior contrast and same-source tint/refraction negative controls. Actual exact-head GPU and four-runtime evidence is pending; arithmetic and mock-GL tests do not establish native pixel or animation equivalence.

## Command hover foundation (draft)

Button, Toggle, Form Submit/Reset and the Accordion, Collapsible, Select and Dropdown Triggers share a family-private static hover recipe over their existing Base handles. Hover adds restrained elevation and an inner edge, while press retains its own feedback and the existing optional pointer self-contact. Selection and keyboard focus remain independent. Disabled commands, and an Accordion Trigger that cannot collapse, withdraw optional material and transient emphasis without whole-control opacity. The declared same-state opaque fallback stays readable.

The design reference is [WWDC25 iPadOS 26 pointer interaction, 9:20–10:05](https://developer.apple.com/videos/play/wwdc2025/208/?time=560). Apple's pointer highlight is a moving refractive platter; the current Boolean-hover recipe is only a static Proto project treatment. It does not implement that moving optical layer, magnetic pointer motion, a universal hover scale or a touch-hover effect. [Apple's Motion guidance](https://developer.apple.com/design/human-interface-guidelines/motion) distinguishes the strength appropriate to direct touch and indirect input.

Existing self-contact is a held primary-pointer session, not hover coordinates. It can continue after the semantic press state clears on leave. Its expanded paint footprint must still pass the unchanged source, neighbor, clipping and carrier guards even at rest; otherwise the control uses explicit fallback. Pure containers gain no new input behavior. The current slice does not implement private MaterialContact drafts, cross-part coordination or another host capability.

The separate four-runtime, light/dark fixture is `/en/test/liquid-glass-hover/`. Its native captures and independent visual review remain pending until the exact candidate runs in CI. Original Toggle optical/detail scenarios remain separate. The separate Form follow-up uses the existing `asFormSubmit`/`asFormReset` owners once and returns their inherited render; it adds no Button hook. The CLI hook-recognition prerequisite closes the existing borrowed-state source path. Submit/Reset keep `material: auto | opaque` with `auto` restored on raw prop removal, and direct or inherited disable suppresses requests without whole-control opacity. Real Form Roots own Submit/Reset callbacks in the native fixture. The original six-part candidate and this Form extension remain separately reviewable; local closure is not independent review or GPU/visual acceptance.
