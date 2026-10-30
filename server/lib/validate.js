// Checks a screen against the rules in AGENTS.md. Text checks only, so it runs anywhere without a browser.
// Errors break a rule of the system. Warnings are worth a second look.

import { nearestClass } from "./kit.js";

const NAMED_COLORS =
  /\b(red|green|blue|yellow|orange|purple|pink|teal|cyan|magenta|lime|navy|maroon|olive|indigo|violet|crimson|coral|salmon|gold|tomato|turquoise|aqua|fuchsia)\b/i;
const VAGUE_BUTTONS = /^(submit|ok|okay|click here|button|go|yes|no|continue here)$/i;

const classListOf = (html) => [...html.matchAll(/\sclass\s*=\s*"([^"]*)"/gi)].flatMap((m) => m[1].split(/\s+/).filter(Boolean));
const textOf = (s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function hexIsGrey(hex) {
  let h = hex.slice(1);
  if (h.length === 3 || h.length === 4) h = [...h.slice(0, 3)].map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return Math.max(r, g, b) - Math.min(r, g, b) <= 8;
}

function colorProblems(css) {
  const found = [];
  for (const m of css.matchAll(/#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi)) if (!hexIsGrey(m[0])) found.push(m[0]);
  for (const m of css.matchAll(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/gi)) {
    const [r, g, b] = m.slice(1, 4).map(Number);
    if (Math.max(r, g, b) - Math.min(r, g, b) > 8) found.push(m[0] + ")");
  }
  for (const m of css.matchAll(/hsla?\(\s*[\d.]+(?:deg)?[\s,]+([\d.]+)%/gi)) if (Number(m[1]) > 3) found.push(m[0] + ")");
  for (const m of css.matchAll(/(?:^|[;\s:])(?:color|background(?:-color)?|border(?:-color)?|fill|stroke)\s*:\s*([^;"]+)/gi)) {
    const n = m[1].match(NAMED_COLORS);
    if (n) found.push(n[0]);
  }
  return found;
}

export function validateScreen(html, kit) {
  const errors = [];
  const warnings = [];
  const add = (list, rule, detail) => list.push({ rule, detail });

  // Setup, only when a whole page was passed in.
  if (/<html[\s>]/i.test(html)) {
    if (!/megamind-labs-ui(\.min)?\.css/i.test(html)) add(errors, "setup", "The page does not link megamind-labs-ui.css.");
    const body = html.match(/<body([^>]*)>/i)?.[1] ?? "";
    if (!/class\s*=\s*"[^"]*\bmm\b[^"]*\bmm-canvas\b|class\s*=\s*"[^"]*\bmm-canvas\b[^"]*\bmm\b/.test(body))
      add(errors, "setup", 'Put class="mm mm-canvas" on <body>.');
  }

  // Only the kit's classes. Anything else means new CSS or a typo.
  const classes = classListOf(html);
  const unknown = [...new Set(classes.filter((c) => (c.startsWith("mm-") || c === "mm") && !kit.classes.has(c)))];
  if (unknown.length) {
    const hint = (c) => {
      const near = nearestClass(kit, c);
      return near ? `${c} (did you mean ${near}?)` : c;
    };
    add(errors, "classes", `These classes are not in the kit: ${unknown.map(hint).join(", ")}.`);
  }
  const unknownStates = [...new Set(classes.filter((c) => c.startsWith("is-") && !kit.states.has(c)))];
  if (unknownStates.length) add(warnings, "classes", `These state classes are not in the kit: ${unknownStates.join(", ")}.`);
  const foreign = [...new Set(classes.filter((c) => !c.startsWith("mm") && !c.startsWith("is-")))];
  if (foreign.length) add(warnings, "classes", `Classes from outside the kit have no styles: ${foreign.slice(0, 12).join(", ")}.`);

  // Greyscale only.
  const styles = [...html.matchAll(/\sstyle\s*=\s*"([^"]*)"/gi)].map((m) => m[1]).join(";");
  const sheets = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
  const colors = [...new Set(colorProblems(styles + "\n" + sheets))];
  if (colors.length) add(errors, "greyscale", `Color found: ${colors.join(", ")}. Use the --mm-* grey tokens.`);
  if (/gradient\(/i.test(styles + sheets)) add(errors, "greyscale", "Gradients are not allowed.");
  if (/box-shadow\s*:/i.test(styles + sheets)) add(warnings, "greyscale", "Shadows are reserved for the kit's sheets and popovers.");
  if (sheets.trim()) add(warnings, "css", "Avoid new CSS. Keep to the kit's classes plus small inline layout tweaks.");

  // Placeholders instead of real images and icons.
  if (/<img\b/i.test(html)) add(errors, "placeholders", "Use mm-ph (add mm-ph--x for photos) instead of <img>.");
  if (/<svg\b/i.test(html)) add(warnings, "placeholders", "Use mm-icon instead of real SVG icons.");
  if (/\b(fa-[a-z-]+|material-icons|material-symbols|bi-[a-z-]+)\b/.test(html)) add(errors, "placeholders", "Icon fonts are not allowed. Use mm-icon.");

  // Real copy.
  if (/lorem ipsum|dolor sit amet/i.test(html)) add(errors, "copy", "Replace lorem ipsum with real copy.");
  const vague = [...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)].map((m) => textOf(m[1])).filter((t) => VAGUE_BUTTONS.test(t));
  if (vague.length) add(warnings, "copy", `Buttons should say what happens, not "${[...new Set(vague)].join('", "')}".`);

  // Per screen: one ink card, one primary action.
  const starts = [...html.matchAll(/<div\b[^>]*\sclass\s*=\s*"[^"]*\bmm-screen\b(?!-)[^"]*"/gi)].map((m) => m.index);
  if (!starts.length) add(errors, "screens", "No mm-screen found. Wrap each screen in <div class=\"mm-screen mm-screen--phone\">.");
  starts.forEach((start, i) => {
    const chunk = html.slice(start, starts[i + 1] ?? html.length);
    const name = `Screen ${i + 1}`;
    const inkCards = (chunk.match(/\bmm-card--ink\b/g) || []).length;
    if (inkCards > 1) add(errors, "ink", `${name} has ${inkCards} mm-card--ink. Use one at most.`);
    const primaries = [...chunk.matchAll(/\sclass\s*=\s*"([^"]*)"/gi)]
      .map((m) => m[1].split(/\s+/))
      .filter((c) => c.includes("mm-btn") && !c.some((x) => /^mm-btn--(secondary|ghost|danger|icon)$/.test(x))).length;
    if (primaries === 0) add(warnings, "primary", `${name} has no primary button.`);
    if (primaries > 1) add(warnings, "primary", `${name} has ${primaries} filled buttons. Keep one primary action and make the rest --secondary or --ghost.`);
  });

  return { ok: errors.length === 0, screens: starts.length, errors, warnings };
}
