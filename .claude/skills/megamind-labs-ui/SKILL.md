---
name: megamind-labs-ui
description: Build greyscale wireframe screens, flows and mockups with the Megamind Labs UI kit (mm- CSS classes). Use when the user asks for screens, wireframes or UI mockups in a project that has this kit.
---

Use this skill when the user asks for wireframes, mockups, screens or flows in a project that uses Megamind Labs UI. Build greyscale wireframe screens with the kit. Output a single HTML file unless the project asks otherwise.

## Setup
- Never copy the CSS or paste markup from this kit into a project. Link the stylesheet from this repo instead: if the project sits next to this repo, use a relative path to `megamind-labs-ui/megamind-labs-ui.css`; otherwise use `https://cdn.jsdelivr.net/gh/gitcamy/megamind-labs-ui@main/megamind-labs-ui.css`. Add the link only if the project does not already load it.
- Put `class="mm mm-canvas"` on `<body>`.
- Use only `mm-*` classes and the CSS variables below. Do not write new CSS except small inline layout tweaks (width, alignment, margin).

## Rules of the system
- Greyscale only. Never introduce color, gradients, shadows or real icons.
- Anything not designed yet is a placeholder: `mm-ph` for images, charts and maps (add `mm-ph--x` for photos), `mm-icon` for icons, `mm-avatar` with initials for people. Put a short label inside placeholders, like "Chart: spend by week".
- Ink (filled black) is reserved for the single primary action, the active state, and the key number on a screen. One `mm-card--ink` per screen at most.
- Danger uses `mm-btn--danger` (dashed). Errors use `mm-field is-error` or `mm-banner`. Never red.
- Write real, specific copy in sentence case. No lorem ipsum. Buttons say exactly what happens ("Send invite", not "Submit").
- Every screen must fit its frame. Use `mm-screen-body` for content that should scroll.

## Presenting
Group screens into flows:
```html
<section class="mm-flow-section">
  <h2>Flow 1: Name</h2>
  <p>One line on what this flow does.</p>
  <div class="mm-flow">
    <div class="mm-artboard">
      <div class="mm-artboard-name">1.1 Screen name</div>
      <div class="mm-artboard-meta">Phone, 390 x 844</div>
      <div class="mm-screen mm-screen--phone"> ... </div>
    </div>
  </div>
</section>
```
Screen sizes: `mm-screen--phone` 390x844 (default), `--compact` 390x640, `--wide` 780x640, `--tablet` 820x1180, `--desktop` 1280x800. Two-pane layouts: `<div class="mm-split"><div class="mm-pane">...</div><div class="mm-pane">...</div></div>` as the only child of a wide screen.

A screen is a vertical flex column with 12px gaps. Use `<div class="mm-spacer"></div>` to push primary buttons and tab bars to the bottom.

## Components
- Type: `mm-display` (36) `mm-hero` (32) `mm-title` (22) `mm-heading` (16) `mm-body` (14) `mm-small` (13) `mm-label` / `mm-caption` (12).
- Layout: `mm-stack`, `mm-row`, `mm-between`, `mm-grid-2`, `mm-gap-1..6`, `mm-grow`, `mm-spacer`.
- Top of screen: `mm-statusbar` (phone frames), `mm-navbar` with `<button class="mm-back">Label</button>`, `<span class="mm-navbar-title">Title</span>`, and a trailing element or `<span></span>`.
- Bottom nav: `<nav class="mm-tabbar"><button class="mm-tab" aria-current="page">Home</button>...</nav>`. Desktop nav: `mm-sidenav` with links, active one `aria-current="page"`.
- Progress through steps: `mm-steps` with `<span class="is-done">`. Carousel: `mm-dots`.
- Buttons: `mm-btn` plus `--block`, `--secondary`, `--ghost`, `--danger`, `--sm`, `--icon`. Text links: `mm-link`.
- Forms: `<div class="mm-field"><label>..</label><input class="mm-input"><span class="mm-field-hint">..</span></div>`. Also `mm-select`, `mm-textarea`, `mm-search` (wrapper around `mm-input`), `mm-inputbar` (input plus trailing text button), `mm-otp` (spans, current one `is-active`), `mm-keypad` (12 buttons), `mm-slider`.
- Selection: `mm-chips` > `mm-chip` with `aria-pressed="true"`; `mm-segmented` > buttons with `aria-pressed`; `<input type="checkbox" class="mm-toggle">`; `mm-check`; `mm-radio`; wrap with `<label class="mm-choice">`.
- Lists: `mm-list` (+ `mm-list--divided`, `mm-list--boxed`) > `mm-list-row` > leading `mm-icon` / `mm-avatar` / `mm-dot`, `mm-list-text` > `mm-list-title` + `mm-list-sub`, trailing `mm-list-value` (with optional `<small>`), `mm-chevron`, or a toggle.
- Cards: `mm-card` (`--filled`, `--ink`) with `mm-card-title`. Section titles: `mm-section-head` with two spans.
- Data: `mm-stat` > `mm-stat-label` + `mm-stat-value` + `mm-stat-meta`; `mm-delta--up/--down`; `mm-progress` with `style="--mm-value:34%"` and an inner `<span>`; `mm-ring` with `style="--mm-value:68"`; `mm-bars` of spans with `--mm-value` heights (one `is-active`); `mm-kv` rows of two spans; `mm-table`; `mm-timeline` (ol, `li.is-done`); `mm-week` (seven spans with `<small>` weekday).
- Conversation: `mm-thread` > `mm-bubble` / `mm-bubble--me` / `mm-bubble-meta`, `mm-typing` (three spans), `mm-proposal` (an assistant's suggested action with confirm and dismiss buttons), `mm-suggestions` (chips), `mm-wave` (voice).
- Feedback: `mm-banner`, `mm-toast` (text plus button), `mm-notification` (with `mm-notification-app`), `mm-live`, `mm-empty`, `mm-skeleton` (`--title`, `--block`, `--circle`), `mm-spinner`.
- Overlays inside a screen: `mm-scrim` then `mm-sheet` or `mm-dialog`. Menus: `mm-menu`. Tooltips: `mm-tooltip`.
- Annotation: `<span class="mm-note" style="top:..;left:..">1</span>` on a positioned element, explained in `<ol class="mm-notes"><li data-n="1">...</li></ol>` next to the artboard.
- Inverted theme: `data-theme="dark"` on any screen.

## Before you finish
Check that every screen has one clear primary action, nothing overflows its frame, there is no color, and all copy is real.
