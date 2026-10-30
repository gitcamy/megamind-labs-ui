// Remote MCP endpoint (Streamable HTTP, stateless). Connect any MCP client to https://<host>/mcp.
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "../lib/mcp.js";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
  "access-control-allow-headers": "content-type, mcp-session-id, mcp-protocol-version, authorization",
  "access-control-expose-headers": "mcp-session-id",
};

async function handle(request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  // No sessions: a fresh server per request keeps this safe to run on any number of instances.
  const server = createMcpServer(new URL(request.url).origin);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  const res = await transport.handleRequest(request);
  for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
  return res;
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
export const OPTIONS = handle;
