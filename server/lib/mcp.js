// The Megamind Labs UI MCP server. It hands the connected AI tool the kit's rules and checks its work;
// the tool's own model writes the screens, so nothing here calls an LLM or costs per use.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadKit, describeComponent, listComponents, CSS_URL } from "./kit.js";
import { scaffoldFlow, SIZES } from "./scaffold.js";
import { validateScreen } from "./validate.js";

const INSTRUCTIONS = `Megamind Labs UI is a greyscale, CSS-only wireframe kit.
When the user asks for wireframes, mockups, screens or flows, call get_rules before writing any markup and follow it exactly.
Use list_components to see every part, get_component to look one up, and get_starter or scaffold_flow for a page skeleton.
Before you show the result, call validate_screen with your HTML and fix every error it reports.`;

const text = (t) => ({ content: [{ type: "text", text: t }] });
const READ_ONLY = { readOnlyHint: true, openWorldHint: false };

export function createMcpServer() {
  const server = new McpServer({ name: "megamind-labs-ui", version: "0.1.0" }, { instructions: INSTRUCTIONS });

  server.registerTool(
    "get_rules",
    {
      title: "Get the kit rules",
      description:
        "Returns the Megamind Labs UI rules: setup, the rules of the system, how to present flows, and every component. Call this first, before building any screen.",
      annotations: READ_ONLY,
    },
    async () => text((await loadKit()).rules)
  );

  server.registerTool(
    "get_reference",
    {
      title: "Get the class reference",
      description: "Returns every mm-* class and CSS variable the stylesheet defines. Use it to check a class exists.",
      annotations: READ_ONLY,
    },
    async () => text((await loadKit()).reference)
  );

  server.registerTool(
    "get_component",
    {
      title: "Look up a component",
      description: 'Returns the classes and usage notes for one component, such as "card", "list", "sheet", "stat" or "tabbar".',
      inputSchema: { name: z.string().min(1).max(40).describe('Component name, like "list" or "mm-card"') },
      annotations: READ_ONLY,
    },
    async ({ name }) => {
      const kit = await loadKit();
      const found = describeComponent(kit, name);
      if (!found) {
        return { ...text(`No component called "${name}". Components: ${[...kit.groups.keys()].join(", ")}.`), isError: true };
      }
      return text(
        [`Classes: ${found.classes.join(", ")}`, "", found.notes.length ? found.notes.join("\n") : "See get_rules for how to use it."].join("\n")
      );
    }
  );

  server.registerTool(
    "get_starter",
    {
      title: "Get a starter page",
      description: "Returns a complete HTML page with the stylesheet linked and one flow of two phone screens, ready to edit.",
      annotations: READ_ONLY,
    },
    async () => {
      const kit = await loadKit();
      return text(
        kit.starter
          .replace(/<!--\s*Swap for the CDN link[^>]*-->\s*/i, "")
          .replace(/href="\.\.\/megamind-labs-ui\.css"/, `href="${CSS_URL}"`)
      );
    }
  );

  server.registerTool(
    "list_components",
    {
      title: "List the components",
      description: "Returns every component group in the kit with its class count and a usage note. Use it to see what exists before reaching for get_component.",
      annotations: READ_ONLY,
    },
    async () => {
      const rows = listComponents(await loadKit());
      return text(rows.map((r) => `${r.name} (${r.classes}): ${r.note || "see get_rules"}`).join("\n"));
    }
  );

  server.registerTool(
    "scaffold_flow",
    {
      title: "Scaffold a flow",
      description:
        "Returns a complete HTML page for a flow, with one correctly sized artboard per screen you name. Each screen has a status bar (phone frames), a title and a primary button to replace. Fill in the content, then run validate_screen.",
      inputSchema: {
        title: z.string().min(1).max(80).describe('Flow name, like "Sign up and verify a phone number"'),
        summary: z.string().min(1).max(200).describe("One line on what the flow gets done"),
        screens: z
          .array(z.object({ name: z.string().min(1).max(60), size: z.enum(Object.keys(SIZES)).optional().describe("Defaults to phone") }))
          .min(1)
          .max(12),
      },
      annotations: READ_ONLY,
    },
    async (flow) => text(scaffoldFlow(flow, CSS_URL))
  );

  server.registerTool(
    "validate_screen",
    {
      title: "Check a screen",
      description:
        "Checks HTML against the kit's rules: only kit classes, no color, placeholders instead of images and icons, real copy, one ink card and one primary action per screen. Call it before showing a screen and fix every error.",
      inputSchema: { html: z.string().min(1).max(400_000).describe("The screen or the whole page") },
      annotations: READ_ONLY,
    },
    async ({ html }) => {
      const result = validateScreen(html, await loadKit());
      const lines = [
        result.ok ? `Passed. ${result.screens} screen(s) checked.` : `Found ${result.errors.length} error(s) in ${result.screens} screen(s). Fix them and check again.`,
        ...result.errors.map((e) => `Error (${e.rule}): ${e.detail}`),
        ...result.warnings.map((w) => `Warning (${w.rule}): ${w.detail}`),
      ];
      return { content: [{ type: "text", text: lines.join("\n") }], structuredContent: result };
    }
  );

  server.registerPrompt(
    "wireframe",
    {
      title: "Wireframe a flow",
      description: "Build screens for a flow with Megamind Labs UI.",
      argsSchema: { flow: z.string().describe("What the screens are for, like \"Sign up and verify a phone number\"") },
    },
    ({ flow }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Wireframe this with Megamind Labs UI: ${flow}\n\nCall get_rules first, build the screens as one HTML file, then run validate_screen and fix every error before you show me.`,
          },
        },
      ],
    })
  );

  return server;
}
