import { test } from "node:test";
import assert from "node:assert/strict";
import { loadKit } from "../lib/kit.js";
import { validateScreen } from "../lib/validate.js";

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
