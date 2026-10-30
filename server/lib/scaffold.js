// Builds a page skeleton for a flow, so the connected tool only has to fill in the screens.
export const SIZES = {
  phone: { label: "Phone, 390 x 844", phoneFrame: true },
  compact: { label: "Phone, 390 x 640", phoneFrame: true },
  wide: { label: "Wide, 780 x 640", phoneFrame: false },
  tablet: { label: "Tablet, 820 x 1180", phoneFrame: false },
  desktop: { label: "Desktop, 1280 x 800", phoneFrame: false },
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function scaffoldFlow({ title, summary, screens }, cssUrl, flowNumber = 1) {
  const boards = screens.map((s, i) => {
    const size = SIZES[s.size ?? "phone"];
    const cls = `mm-screen mm-screen--${s.size ?? "phone"}`;
    return `      <div class="mm-artboard">
        <div class="mm-artboard-name">${flowNumber}.${i + 1} ${esc(s.name)}</div>
        <div class="mm-artboard-meta">${size.label}</div>
        <div class="${cls}">
${size.phoneFrame ? '          <div class="mm-statusbar"><span>9:41</span></div>\n' : ""}          <h1 class="mm-title">${esc(s.name)}</h1>
          <!-- Replace with this screen's content -->
          <div class="mm-spacer"></div>
          <button class="mm-btn mm-btn--block">Primary action</button>
        </div>
      </div>`;
  });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="stylesheet" href="${cssUrl}">
</head>
<body class="mm mm-canvas" style="margin:0">

  <section class="mm-flow-section">
    <h2>Flow ${flowNumber}: ${esc(title)}</h2>
    <p>${esc(summary)}</p>
    <div class="mm-flow">

${boards.join("\n\n")}

    </div>
  </section>

</body>
</html>
`;
}
