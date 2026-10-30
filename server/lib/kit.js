// Loads the kit's agent files from the CDN, so the server always serves what the repo publishes.
// Set KIT_CDN_REF to a tag (e.g. "v0.1.0") to pin it.
const REF = process.env.KIT_CDN_REF || "main";
export const CDN = `https://cdn.jsdelivr.net/gh/gitcamy/megamind-labs-ui@${REF}`;
export const CSS_URL = `${CDN}/megamind-labs-ui.css`;

const FILES = {
  rules: "AGENTS.md",
  reference: "reference/classes.md",
  starter: "screens/starter.html",
  css: "megamind-labs-ui.css",
};
const TTL = 10 * 60 * 1000;
let cache = null;

async function fetchText(path) {
  const res = await fetch(`${CDN}/${path}`);
  if (!res.ok) throw new Error(`Could not load ${path} from the CDN (${res.status}).`);
  return res.text();
}

export async function loadKit() {
  if (cache && Date.now() - cache.at < TTL) return cache.kit;
  const entries = await Promise.all(Object.entries(FILES).map(async ([k, p]) => [k, await fetchText(p)]));
  const kit = Object.fromEntries(entries);

  // Every class the stylesheet defines, grouped the same way reference/classes.md groups them.
  kit.classes = new Set([...kit.css.matchAll(/\.(mm(?:--?[a-z0-9]+)*)/g)].map((m) => m[1]));
  kit.states = new Set([...kit.css.matchAll(/\.(is-[a-z0-9-]+)/g)].map((m) => m[1]));
  kit.groups = new Map();
  for (const c of [...kit.classes].sort()) {
    const key = c === "mm" ? "base" : c.split("-")[1];
    if (!kit.groups.has(key)) kit.groups.set(key, []);
    kit.groups.get(key).push(c);
  }

  // The bullets under "## Components" in AGENTS.md, which say how each part is used.
  const section = kit.rules.split(/^## Components\s*$/m)[1]?.split(/^## /m)[0] ?? "";
  kit.componentNotes = section.split("\n").filter((l) => l.startsWith("- "));

  cache = { at: Date.now(), kit };
  return kit;
}

// The usage notes and classes for one component, looked up by name ("card", "mm-list", "lists").
export function describeComponent(kit, name) {
  const key = name.trim().toLowerCase().replace(/^mm-/, "").replace(/s$/, "").split("-")[0];
  const matches = [...kit.groups.entries()].filter(([g]) => g === key || g === key + "s" || g.startsWith(key));
  if (!matches.length) return null;
  const classes = matches.flatMap(([, list]) => list);
  const notes = kit.componentNotes.filter((l) => classes.some((c) => l.includes(`\`${c}`) || l.includes(`${c} `)));
  return { classes, notes };
}
