// Cloudflare Worker for the MCP endpoint. Reuses the same handler the Vercel route uses.
import { POST, GET, DELETE, OPTIONS } from "../api/mcp.js";

const HANDLERS = { POST, GET, DELETE, OPTIONS };

export default {
  async fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname !== "/mcp" && pathname !== "/") return new Response("Not found", { status: 404 });
    const handler = HANDLERS[request.method];
    return handler ? handler(request) : new Response("Method not allowed", { status: 405 });
  },
};
