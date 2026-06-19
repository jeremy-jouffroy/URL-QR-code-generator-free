// Generates the app's SVG icons (stylized QR motif in the UI colors).
// Then rasterized to PNG via qlmanage. Utility script — not shipped on Pages.
const fs = require("fs");

const ACCENT = "#f15e00";
const HOLE = "#1c140d";

function motif(box, cx, cy) {
  const u = box / 7;
  const ox = cx - box / 2;
  const oy = cy - box / 2;
  let s = "";
  const rect = (x, y, w, h, r, fill) =>
    `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" rx="${r.toFixed(2)}" fill="${fill}"/>`;

  function finder(gx, gy) {
    const x = ox + gx * u;
    const y = oy + gy * u;
    s += rect(x, y, 3 * u, 3 * u, u * 0.55, ACCENT);
    s += rect(x + 0.6 * u, y + 0.6 * u, 1.8 * u, 1.8 * u, u * 0.38, HOLE);
    s += rect(x + 1.05 * u, y + 1.05 * u, 0.9 * u, 0.9 * u, u * 0.22, ACCENT);
  }
  finder(0, 0);
  finder(4, 0);
  finder(0, 4);

  const dots = [
    [3, 0], [3, 2], [3, 4], [3, 6],
    [0, 3], [2, 3], [4, 3], [6, 3],
    [4, 4], [6, 4], [4, 6], [6, 6], [5, 5],
  ];
  for (const [c, r] of dots) {
    s += rect(ox + c * u + 0.11 * u, oy + r * u + 0.11 * u, 0.78 * u, 0.78 * u, 0.18 * u, ACCENT);
  }
  return s;
}

const GRAD = `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#3a2210"/><stop offset="1" stop-color="#15110d"/></linearGradient></defs>`;

function icon({ rounded, contentRatio }) {
  const S = 512;
  const bg = rounded
    ? `<rect x="0" y="0" width="${S}" height="${S}" rx="${S * 0.22}" fill="url(#bg)"/>`
    : `<rect x="0" y="0" width="${S}" height="${S}" fill="url(#bg)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">${GRAD}${bg}${motif(S * contentRatio, S / 2, S / 2)}</svg>`;
}

fs.writeFileSync("icon-any.svg", icon({ rounded: true, contentRatio: 0.64 }));
fs.writeFileSync("icon-maskable.svg", icon({ rounded: false, contentRatio: 0.55 }));
fs.writeFileSync("icon-apple.svg", icon({ rounded: false, contentRatio: 0.6 }));
console.log("SVG icons written");
