// Cloudflare Worker for the MCP endpoint. Reuses the same handler the Vercel route uses.
import { POST, GET, DELETE, OPTIONS } from "../api/mcp.js";
import { useBundledKit } from "../lib/kit.js";
import rules from "../../AGENTS.md";
import reference from "../../reference/classes.md";
import starter from "../../screens/starter.html";
import css from "../../megamind-labs-ui.css";

// Ship the kit with the Worker, so a deploy never serves rules from a stale CDN cache.
useBundledKit({ rules, reference, starter, css });

const HANDLERS = { POST, GET, DELETE, OPTIONS };

export default {
  async fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname !== "/mcp" && pathname !== "/") return new Response("Not found", { status: 404 });
    const handler = HANDLERS[request.method];
    return handler ? handler(request) : new Response("Method not allowed", { status: 405 });
  },
};
