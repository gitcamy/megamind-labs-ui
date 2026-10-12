// Builds every agent-facing file from agent/rules.md and megamind-labs-ui.css.
// Run `node agent/build.mjs` to write them, or `node agent/build.mjs --check` to fail when they are stale.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");

// Change to a tag (e.g. "v0.1.0") when cutting a release, so generated screens don't break when main changes.
const CDN_REF = "v0.1.0";
const CSS_URL = `https://cdn.jsdelivr.net/gh/gitcamy/megamind-labs-ui@${CDN_REF}/megamind-labs-ui.css`;

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const css = readFileSync(join(root, "megamind-labs-ui.css"), "utf8");
const REFERENCE_URL = CSS_URL.replace("megamind-labs-ui.css", "reference/classes.md");
const rules = readFileSync(join(root, "agent/rules.md"), "utf8")
  .replaceAll("{{CSS_URL}}", CSS_URL)
  .replaceAll("{{REFERENCE_URL}}", REFERENCE_URL);
const trigger =
  "Use this when the user asks for wireframes, mockups, screens or flows. Build greyscale wireframe screens with the Megamind Labs UI kit. Output a single HTML file unless the project asks otherwise.";

// Every class the stylesheet defines, grouped by its first word after "mm-".
const classes = [...new Set([...css.matchAll(/\.(mm(?:-[a-z0-9]+)*)/g)].map((m) => m[1]))].sort();
const groups = new Map();
for (const c of classes) {
  const key = c === "mm" ? "base" : c.split("-")[1];
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(c);
}

// Design tokens from the first :root block (light theme).
const rootBlock = css.match(/:root\s*\{([\s\S]*?)\n\}/)[1];
const tokens = [...rootBlock.matchAll(/^\s*(--mm-[\w-]+):\s*([^;]+);\s*(?:\/\*\s*(.*?)\s*\*\/)?/gm)].map(
  (m) => ({ name: m[1], value: m[2].trim(), note: m[3] ?? "" })
);

const reference = [
  "# Megamind Labs UI reference",
  "",
  `Generated from megamind-labs-ui.css (v${pkg.version}). Do not edit by hand; run \`node agent/build.mjs\`.`,
  "",
  `Stylesheet: ${CSS_URL}`,
  "",
  "## Design tokens",
  "",
  "| Variable | Value | Use |",
  "| --- | --- | --- |",
  ...tokens.map((t) => `| \`${t.name}\` | \`${t.value}\` | ${t.note} |`),
  "",
  "## Classes",
  "",
  ...[...groups.entries()].flatMap(([key, list]) => [
    `### ${key}`,
    "",
    list.map((c) => `\`${c}\``).join(", "),
    "",
  ]),
].join("\n");

const frontmatter = `---
name: megamind-labs-ui
description: Build greyscale wireframe screens, flows and mockups with the Megamind Labs UI kit (mm- CSS classes). Use when the user asks for screens, wireframes or UI mockups.
---

`;

const agents = `# Megamind Labs UI

${trigger}

${rules}`;

const prompt = `# Megamind Labs UI: prompt for AI design tools

Paste everything below the line into Claude, v0, Lovable, Cursor or another tool, then describe the screens you want.

---

You are building greyscale wireframe mockups with Megamind Labs UI, a CSS-only kit. Output a single HTML file.

${rules}`;

const llms = `# Megamind Labs UI

> A CSS-only, greyscale wireframe kit. Link one stylesheet, put \`class="mm mm-canvas"\` on the body, and build screens from \`mm-*\` classes.

- [Rules for building screens](${CSS_URL.replace("megamind-labs-ui.css", "AGENTS.md")}): setup, the rules of the system, presenting flows, and the component list.
- [Class and token reference](${REFERENCE_URL}): every \`mm-*\` class and CSS variable.
- [Stylesheet](${CSS_URL}): the single file to link.
- [Source](https://github.com/gitcamy/megamind-labs-ui): repository, starter screens and the React wrappers.
`;

const outputs = {
  "plugins/megamind-labs-ui/skills/megamind-labs-ui/SKILL.md": frontmatter + trigger + "\n\n" + rules,
  "AGENTS.md": agents,
  "PROMPT.md": prompt,
  "llms.txt": llms,
  "reference/classes.md": reference + "\n",
};

let stale = [];
for (const [path, content] of Object.entries(outputs)) {
  const full = join(root, path);
  if (check) {
    const current = existsSync(full) ? readFileSync(full, "utf8") : null;
    if (current !== content) stale.push(path);
    continue;
  }
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
  console.log(`wrote ${path}`);
}

if (check) {
  if (stale.length) {
    console.error(`Stale generated files: ${stale.join(", ")}. Run node agent/build.mjs.`);
    process.exit(1);
  }
  console.log("Agent files are up to date.");
}
