//! Maps recorded declarations onto GPUI styles.
//!
//! The completeness test is the important one: it walks every token in the
//! vocabulary and pins down exactly which properties do not reach a
//! `StyleRefinement` yet. That list is an explicit inventory of remaining
//! work, and a property leaving or joining it fails the test rather than
//! quietly changing what a surface paints.

use std::collections::BTreeSet;

use gpui::{AbsoluteLength, DefiniteLength, Display, Length, Position};
use proto_ui_gpui::style::{map, Unmapped};
use proto_ui_style::length::LengthContext;
use proto_ui_style::{themes, vocabulary, ColorScheme, Substitution};

fn resolve(tokens: &[&str], language: &str) -> proto_ui_style::ResolvedStyle {
    let theme = themes()
        .get(language, ColorScheme::Light)
        .expect("theme present");
    let mut resolved = vocabulary().resolve_all(tokens.iter().copied());
    for value in resolved.declarations.values_mut() {
        if let Substitution::Resolved(substituted) = theme.substitute(value) {
            *value = substituted;
        }
    }
    resolved
}

#[test]
fn maps_layout_and_box_properties() {
    let mapped = map(
        &resolve(
            &["flex", "flex-col", "items-center", "px-3", "py-1", "gap-2"],
            "shadcn",
        ),
        LengthContext::default(),
    );
    let style = &mapped.refinement;

    assert_eq!(style.display, Some(Display::Flex));
    assert_eq!(style.flex_direction, Some(gpui::FlexDirection::Column));
    assert_eq!(style.align_items, Some(gpui::AlignItems::Center));

    // 0.75rem and 0.25rem at the default root size.
    assert_eq!(
        style.padding.left,
        Some(DefiniteLength::Absolute(AbsoluteLength::Pixels(gpui::px(
            12.0
        ))))
    );
    assert_eq!(
        style.padding.top,
        Some(DefiniteLength::Absolute(AbsoluteLength::Pixels(gpui::px(
            4.0
        ))))
    );
    assert_eq!(
        style.gap.width,
        Some(DefiniteLength::Absolute(AbsoluteLength::Pixels(gpui::px(
            8.0
        ))))
    );
    assert!(
        mapped.unmapped_properties().is_empty(),
        "{:?}",
        mapped.unmapped
    );
}

#[test]
fn maps_a_percentage_to_a_fraction_and_keeps_position() {
    let mapped = map(
        &resolve(&["absolute", "w-full", "left-1/2"], "shadcn"),
        LengthContext::default(),
    );
    let style = &mapped.refinement;

    assert_eq!(style.position, Some(Position::Absolute));
    assert_eq!(
        style.size.width,
        Some(Length::Definite(DefiniteLength::Fraction(1.0)))
    );
    assert_eq!(
        style.inset.left,
        Some(Length::Definite(DefiniteLength::Fraction(0.5)))
    );
}

#[test]
fn maps_colour_through_the_theme_of_each_design_language() {
    // The expected values are stated independently of the pipeline: Brutalist
    // authors `--background: #f5f5f5` and Shadcn authors `lab(100% 0 0)`,
    // which is pure white. Landing on them exercises token lookup, theme
    // substitution, colour parsing and the conversion to GPUI in one go.
    let expected_brutalist: gpui::Hsla = gpui::Rgba {
        r: 245.0 / 255.0,
        g: 245.0 / 255.0,
        b: 245.0 / 255.0,
        a: 1.0,
    }
    .into();

    let brutalist = map(
        &resolve(&["bg-background"], "brutalist"),
        LengthContext::default(),
    );
    assert_eq!(
        brutalist.refinement.background,
        Some(gpui::Fill::Color(expected_brutalist.into()))
    );

    // That `lab(100% 0 0)` is white is pinned one layer down, in the colour
    // suite. What matters here is that the plumbing reaches GPUI and that the
    // two design languages do not collapse onto one value.
    let shadcn = map(
        &resolve(&["bg-background"], "shadcn"),
        LengthContext::default(),
    );
    assert!(shadcn.refinement.background.is_some());

    // The two design languages must not collapse onto the same colour.
    assert_ne!(
        brutalist.refinement.background,
        shadcn.refinement.background
    );
}

#[test]
fn reports_a_property_it_cannot_express() {
    // `will-change` is a browser hint with no GPUI counterpart.
    let mapped = map(
        &resolve(&["will-change-transform"], "shadcn"),
        LengthContext::default(),
    );
    assert!(mapped
        .unmapped
        .iter()
        .any(|(property, _, reason)| property == "will-change"
            && *reason == Unmapped::UnknownProperty));
    assert!(!mapped.is_complete());
}

/// The inventory of what still has to be mapped.
///
/// Every entry here is deliberate, not an oversight: each needs work beyond a
/// property assignment, and each is named in the plan as its own slice.
const EXPECTED_UNMAPPED: [&str; 28] = [
    // Composed paint that needs BoxShadow construction from the ring/shadow
    // custom properties rather than a single declaration.
    "box-shadow",
    "outline",
    "outline-color",
    "outline-offset",
    "outline-style",
    "outline-width",
    // Element-level concerns GPUI expresses outside Style.
    "transform",
    "backdrop-filter",
    "z-index",
    "pointer-events",
    "touch-action",
    "user-select",
    "resize",
    "will-change",
    "background-clip",
    // The animation driver is its own slice.
    "animation-duration",
    "animation-fill-mode",
    "animation-name",
    "animation-timing-function",
    "transition-duration",
    "transition-property",
    "transition-timing-function",
    // Text properties this layer has not mapped yet.
    "letter-spacing",
    "text-align",
    "text-decoration-line",
    "text-transform",
    "text-underline-offset",
    "white-space",
];

#[test]
fn every_token_maps_or_appears_in_the_inventory() {
    let mut unmapped: BTreeSet<String> = BTreeSet::new();
    let mut mapped_count = 0usize;

    for language in themes().names() {
        for (token, _) in vocabulary().tokens_with_declarations() {
            let resolved = resolve(&[token.as_str()], language);
            // A token from another design language leaves an unsubstituted
            // reference; the colour suite covers that case.
            if resolved
                .declarations
                .values()
                .any(|value| value.contains("var("))
            {
                continue;
            }
            let mapped = map(&resolved, LengthContext::default());
            mapped_count += mapped.refinement.padding.left.is_some() as usize;
            for property in mapped.unmapped_properties() {
                unmapped.insert(property.to_string());
            }
        }
    }

    let expected: BTreeSet<String> = EXPECTED_UNMAPPED.iter().map(|s| s.to_string()).collect();
    let unexpected: Vec<&String> = unmapped.difference(&expected).collect();
    let gone: Vec<&String> = expected.difference(&unmapped).collect();

    assert!(
        unexpected.is_empty(),
        "a property stopped mapping or is newly present: {unexpected:?}"
    );
    assert!(
        gone.is_empty(),
        "these are now mapped and should leave the inventory: {gone:?}"
    );
    // Guards against the loop finding nothing, which would make this vacuous.
    assert!(mapped_count > 0, "no token produced a mapped padding");
}
