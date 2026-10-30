import { test } from "node:test";
import assert from "node:assert/strict";
import { POST, OPTIONS } from "../api/mcp.js";

let n = 0;
const rpc = async (method, params = {}) => {
  const res = await POST(new Request("http://localhost/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-protocol-version": "2025-06-18" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++n, method, params }),
  }));
  assert.equal(res.headers.get("access-control-allow-origin"), "*");
  return (await res.json()).result;
};

test("initializes with instructions", async () => {
  const r = await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } });
  assert.equal(r.serverInfo.name, "megamind-labs-ui");
  assert.match(r.instructions, /get_rules/);
  assert.equal(r.serverInfo.icons[0].src, "http://localhost/icon.png");
});

test("lists the tools and prompt", async () => {
  assert.deepEqual((await rpc("tools/list")).tools.map((t) => t.name), ["get_rules", "get_reference", "get_component", "get_starter", "list_components", "scaffold_flow", "validate_screen"]);
  assert.deepEqual((await rpc("prompts/list")).prompts.map((p) => p.name), ["wireframe"]);
});

test("get_rules returns AGENTS.md", async () => {
  const r = await rpc("tools/call", { name: "get_rules", arguments: {} });
  assert.match(r.content[0].text, /## Rules of the system/);
});

test("get_component finds modifiers and notes", async () => {
  const r = await rpc("tools/call", { name: "get_component", arguments: { name: "card" } });
  assert.match(r.content[0].text, /mm-card--ink/);
  const miss = await rpc("tools/call", { name: "get_component", arguments: { name: "carousel3d" } });
  assert.equal(miss.isError, true);
});

test("get_starter links the CDN stylesheet and validates", async () => {
  const page = (await rpc("tools/call", { name: "get_starter", arguments: {} })).content[0].text;
  assert.match(page, /cdn\.jsdelivr\.net\/gh\/gitcamy\/megamind-labs-ui@/);
  const r = await rpc("tools/call", { name: "validate_screen", arguments: { html: page } });
  assert.equal(r.structuredContent.ok, true);
});

test("list_components names the groups", async () => {
  const r = await rpc("tools/call", { name: "list_components", arguments: {} });
  assert.match(r.content[0].text, /^card \(\d+\)/m);
});

test("scaffold_flow builds a page that validates", async () => {
  const args = { title: "Invite a teammate", summary: "Send an invite and see it pending.", screens: [{ name: "Enter email" }, { name: "Pending invites", size: "desktop" }] };
  const page = (await rpc("tools/call", { name: "scaffold_flow", arguments: args })).content[0].text;
  assert.match(page, /1\.2 Pending invites/);
  assert.match(page, /mm-screen--desktop/);
  const r = await rpc("tools/call", { name: "validate_screen", arguments: { html: page } });
  assert.equal(r.structuredContent.ok, true);
});

test("validate_screen suggests the nearest class", async () => {
  const html = '<div class="mm-screen mm-screen--phone"><div class="mm-crad"></div><button class="mm-btn">Send invite</button></div>';
  const r = await rpc("tools/call", { name: "validate_screen", arguments: { html } });
  assert.match(r.content[0].text, /mm-crad \(did you mean mm-card\?\)/);
});

test("answers CORS preflight", async () => {
  const res = await OPTIONS(new Request("http://localhost/mcp", { method: "OPTIONS" }));
  assert.equal(res.status, 204);
});
