# Changelog

## Unreleased

- New `mm-app`, `mm-app-side` and `mm-app-main`: a full-page app shell for clickable prototypes outside artboards, with a sticky sidebar that stacks on top below 900px.
- New `mm-page-head`: a page title and caption with actions on the right.
- New `mm-stats`: a row of two to five key figures split by dividers, at a size that suits a dashboard header.
- `mm-list-row` now works as a `<button>` or `<a>`, with a hover and an open state (`aria-current="true"`) for a list beside its detail pane.
- `validate_screen` now treats a `<style>` block that restyles the kit's own classes as an error.
- Desktop layouts: new `mm-split--side`, a 240px sidebar pane beside a scrolling main pane, for apps with `mm-sidenav`. `validate_screen` warns about screens restyled by hand with inline padding or flex-direction.
- `mm-between` now works on its own as a row with its children pushed to both ends. Before, it only worked alongside `mm-row`.
- New `mm-ph--thumb`: a 56px list-row photo placeholder with its label hidden. Placeholders now clip anything that doesn't fit.
- `mm-link` written as a `<button>` no longer stretches across a card and centers its text.

- Dark mode is now a first-class theme (renamed from Inverted). The docs remember your choice and follow the system setting on first visit.
- New `--mm-accent` token: #6D8ECA in light mode, #E3F988 in dark. It highlights badges, pressed chips, dots, steps, the active tab and annotation pins. Everything else stays greyscale.
- New `generate.html`: describe a screen by typing or speaking, and Claude builds it from the kit. Add a sketch or screenshot for context, ask for changes, then copy the markup, React or a full HTML page, or download it. Past screens are kept in your browser and listed under the menu.
- Docs: click any single component to copy its markup or a ready-made prompt, search the components, pick a screen size from a dropdown, jump to a flow from its chip, and the device frames scale to fit the window.

## 0.1.0

First public release. Tokens, 40+ components, presentation layer (flows, artboards, device screens, annotations), inverted theme, React wrappers, AI prompt, and 26 starter screens across six flows.
