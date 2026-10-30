import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadKit, useBundledKit } from "../lib/kit.js";
import { validateScreen } from "../lib/validate.js";

// Validate against the kit in this checkout, so new classes count before they reach the CDN.
const local = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
useBundledKit({ rules: local("AGENTS.md"), reference: local("reference/classes.md"), starter: local("screens/starter.html"), css: local("megamind-labs-ui.css") });
const kit = await loadKit();
const rules = (r) => r.errors.map((e) => e.rule);

test("the starter page passes", async () => {
  const page = kit.starter.replace(/href="\.\.\/megamind-labs-ui\.css"/, 'href="https://cdn/megamind-labs-ui.css"');
  assert.equal(validateScreen(page, kit).ok, true);
});

test("modifier classes are known", () => {
  const r = validateScreen('<div class="mm-screen mm-screen--phone"><button class="mm-btn mm-btn--block">Pay $42</button></div>', kit);
  assert.deepEqual(r.errors, []);
});

test("catches each rule", () => {
  const html = `<div class="mm-screen mm-screen--phone">
    <div class="mm-card mm-card--ink"></div><div class="mm-card mm-card--ink"></div>
    <p class="mm-made-up" style="color: #3366ff">Lorem ipsum</p><img src="a.png">
    <span style="background: linear-gradient(#000,#fff)"></span>
    <button class="mm-btn">Submit</button></div>`;
  assert.deepEqual(rules(validateScreen(html, kit)).sort(), ["classes", "copy", "greyscale", "greyscale", "ink", "placeholders"]);
});

test("greys pass, colors fail", () => {
  const grey = validateScreen('<div class="mm-screen" style="color:#404040;background:rgb(235,235,235)"><button class="mm-btn">Save</button></div>', kit);
  assert.equal(grey.ok, true);
  const red = validateScreen('<div class="mm-screen" style="border-color: red"><button class="mm-btn">Save</button></div>', kit);
  assert.deepEqual(rules(red), ["greyscale"]);
});

test("a full page needs the stylesheet and body classes", () => {
  const r = validateScreen('<html><body><div class="mm-screen"><button class="mm-btn">Save</button></div></body></html>', kit);
  assert.deepEqual(rules(r), ["setup", "setup"]);
});

test("shapes stay empty", () => {
  const html = `<div class="mm-screen mm-screen--desktop">
    <div class="mm-steps"><span class="is-done">Cart</span><span>Information</span></div>
    <div class="mm-row"><span class="mm-icon">Secure</span><span class="mm-small">Secure checkout</span></div>
    <button class="mm-btn">Continue to checkout</button></div>`;
  const r = validateScreen(html, kit);
  assert.deepEqual(rules(r), ["shapes"]);
  assert.match(r.errors[0].detail, /mm-icon, .*mm-steps|mm-steps.*mm-icon/);
  const empty = html.replace(/>(Cart|Information|Secure)</g, "><");
  assert.equal(validateScreen(empty, kit).ok, true);
});

test("mm-kv rows are divs of two", () => {
  const good = '<div class="mm-screen"><div class="mm-kv"><div><span>Subtotal</span><span>€120.00</span></div></div><button class="mm-btn">Pay €120.00</button></div>';
  assert.equal(validateScreen(good, kit).ok, true);
  const loose = good.replace("<div><span>Subtotal</span><span>€120.00</span></div>", "<span>Subtotal</span><span>€120.00</span>");
  assert.deepEqual(rules(validateScreen(loose, kit)), ["shapes"]);
});

test("an inlined kit stylesheet counts as setup and is not new CSS", () => {
  const page = kit.starter.replace(/<link rel="stylesheet" href="\.\.\/megamind-labs-ui\.css">/, `<style>${kit.css}</style>`);
  const r = validateScreen(page, kit);
  assert.equal(r.ok, true);
  assert.deepEqual(r.warnings.filter((w) => w.rule === "css" || w.rule === "greyscale"), []);
});

test("a desktop frame restyled by hand is flagged, the sidebar split is not", () => {
  const hand = `<div class="mm-screen mm-screen--desktop" style="flex-direction:row; padding:0; gap:0;">
    <nav class="mm-sidenav"><a aria-current="page">Signals</a></nav>
    <main class="mm-stack"><button class="mm-btn">Create task</button></main></div>`;
  assert.deepEqual(validateScreen(hand, kit).warnings.map((w) => w.rule), ["layout"]);
  const split = `<div class="mm-screen mm-screen--desktop"><div class="mm-split mm-split--side">
    <div class="mm-pane"><nav class="mm-sidenav"><a aria-current="page">Signals</a></nav></div>
    <main class="mm-pane"><div class="mm-between"><h1 class="mm-title">Signals</h1><button class="mm-btn">Create task</button></div></main></div></div>`;
  const r = validateScreen(split, kit);
  assert.equal(r.ok, true);
  assert.deepEqual(r.warnings, []);
});

test("a full-page app prototype passes without artboard screens", () => {
  const page = `<!doctype html><html><head><link rel="stylesheet" href="https://cdn/megamind-labs-ui.css"></head>
    <body class="mm mm-app"><aside class="mm-app-side"><nav class="mm-sidenav"><a aria-current="page">Outreach</a></nav></aside>
    <main class="mm-app-main"><header class="mm-page-head"><div><h1 class="mm-title">Outreach</h1></div><button class="mm-btn">Copy next message</button></header>
    <div class="mm-stats"><div class="mm-stat"><span class="mm-stat-label">Targets</span><span class="mm-stat-value">48</span></div></div>
    <div class="mm-list mm-list--boxed"><button class="mm-list-row" aria-current="true"><div class="mm-list-text"><div class="mm-list-title">Positioning and voice</div></div></button></div>
    </main></body></html>`;
  const r = validateScreen(page, kit);
  assert.equal(r.ok, true);
  assert.deepEqual(r.warnings, []);
});

test("a <style> block that restyles kit classes is an error, other CSS a warning", () => {
  const screen = '<div class="mm-screen mm-screen--phone"><button class="mm-btn mm-btn--block">Pay $42</button></div>';
  const restyled = validateScreen(`<style>.mm-table { display: block; }</style>${screen}`, kit);
  assert.deepEqual(rules(restyled), ["css"]);
  const own = validateScreen(`<style>.toast-wrap { position: fixed; }</style>${screen}`, kit);
  assert.equal(own.ok, true);
  assert.deepEqual(own.warnings.map((w) => w.rule), ["css"]);
});

test("squeezed placeholders and ink beside the primary are flagged", () => {
  const html = `<div class="mm-screen mm-screen--phone">
    <div class="mm-list-row"><div class="mm-ph mm-ph--x" style="width:56px;min-height:56px">Photo: linen throw</div></div>
    <div class="mm-card mm-card--ink"><p class="mm-hero">£166.00</p></div>
    <button class="mm-btn mm-btn--block">Pay £166.00</button></div>`;
  const r = validateScreen(html, kit);
  assert.equal(r.ok, true);
  assert.deepEqual(r.warnings.map((w) => w.rule).sort(), ["ink", "placeholders"]);
  const fixed = html.replace('mm-ph mm-ph--x" style="width:56px;min-height:56px"', 'mm-ph mm-ph--x mm-ph--thumb"').replace("mm-card--ink", "mm-card--filled");
  assert.deepEqual(validateScreen(fixed, kit).warnings, []);
});
