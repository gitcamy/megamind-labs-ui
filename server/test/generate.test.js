import { test } from "node:test";
import assert from "node:assert/strict";
process.env.ANTHROPIC_API_KEY ||= "test";
process.env.APP_ORIGINS = "https://megamindlabs.ai";
const { POST } = await import("../api/generate.js");

test("refuses without a sign-in, before touching the database or Anthropic", async () => {
  const res = await POST(new Request("http://localhost/api/generate", { method: "POST", headers: { origin: "https://evil.example" }, body: "{}" }));
  assert.equal(res.status, 401);
  assert.equal((await res.json()).error, "signed_out");
  assert.equal(res.headers.get("access-control-allow-origin"), "https://megamindlabs.ai");
});
