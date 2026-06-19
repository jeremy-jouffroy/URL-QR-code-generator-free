"use strict";

// ---- Configuration ----
const QUIET_ZONE = 4;        // marge (en modules) autour du QR — requise pour la lisibilité
const EC_LEVEL = "M";        // niveau de correction d'erreur (L, M, Q, H)
const PNG_SIZE = 1024;       // résolution du PNG exporté (px)

// ---- Éléments du DOM ----
const els = {
  url: document.getElementById("url"),
  fg: document.getElementById("fg"),
  fgHex: document.getElementById("fg-hex"),
  bg: document.getElementById("bg"),
  bgHex: document.getElementById("bg-hex"),
  transparent: document.getElementById("transparent"),
  output: document.getElementById("qr-output"),
  encodedHint: document.getElementById("encoded-hint"),
  contrastWarning: document.getElementById("contrast-warning"),
  dlPng: document.getElementById("dl-png"),
  dlSvg: document.getElementById("dl-svg"),
};

// État courant du QR (matrice + paramètres) pour l'export
let current = null;

// ---- Helpers ----

// Ajoute https:// si l'utilisateur n'a pas précisé de schéma
function normalizeUrl(raw) {
  const value = raw.trim();
  if (!value) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value; // a déjà un schéma (https:, mailto:, tel:, etc.)
  return "https://" + value;
}

// Luminance relative pour estimer le contraste
function luminance(hex) {
  const c = hex.replace("#", "");
  const r = parseInt(c.substr(0, 2), 16) / 255;
  const g = parseInt(c.substr(2, 2), 16) / 255;
  const b = parseInt(c.substr(4, 2), 16) / 255;
  const lin = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

function isValidHex(v) {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

// ---- Génération du QR ----

function buildMatrix(text) {
  const qr = qrcode(0, EC_LEVEL); // 0 = type auto
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const matrix = [];
  for (let r = 0; r < count; r++) {
    const row = [];
    for (let c = 0; c < count; c++) row.push(qr.isDark(r, c));
    matrix.push(row);
  }
  return matrix;
}

function buildSvg(matrix, fg, bg, transparent) {
  const count = matrix.length;
  const size = count + QUIET_ZONE * 2;
  let rects = "";

  if (!transparent) {
    rects += `<rect x="0" y="0" width="${size}" height="${size}" fill="${bg}"/>`;
  }

  // On fusionne les modules contigus de chaque ligne en un seul rectangle (SVG plus léger)
  for (let r = 0; r < count; r++) {
    let c = 0;
    while (c < count) {
      if (matrix[r][c]) {
        let len = 1;
        while (c + len < count && matrix[r][c + len]) len++;
        rects += `<rect x="${c + QUIET_ZONE}" y="${r + QUIET_ZONE}" width="${len}" height="1" fill="${fg}"/>`;
        c += len;
      } else {
        c++;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img">${rects}</svg>`;
}

function render() {
  const encoded = normalizeUrl(els.url.value);
  els.encodedHint.textContent = encoded ? "Encode : " + encoded : "";

  const fg = isValidHex(els.fgHex.value) ? els.fgHex.value : els.fg.value;
  const bg = isValidHex(els.bgHex.value) ? els.bgHex.value : els.bg.value;
  const transparent = els.transparent.checked;

  // Avertissement de contraste
  els.contrastWarning.hidden = transparent || contrastRatio(fg, bg) >= 2.5;

  if (!encoded) {
    els.output.innerHTML = "";
    current = null;
    setButtons(false);
    return;
  }

  let matrix;
  try {
    matrix = buildMatrix(encoded);
  } catch (e) {
    els.output.innerHTML = "";
    els.encodedHint.textContent = "Texte trop long pour un QR code.";
    current = null;
    setButtons(false);
    return;
  }

  const svg = buildSvg(matrix, fg, bg, transparent);
  els.output.innerHTML = svg;
  current = { matrix, fg, bg, transparent };
  setButtons(true);
}

function setButtons(enabled) {
  els.dlPng.disabled = !enabled;
  els.dlSvg.disabled = !enabled;
}

// ---- Export ----

function fileBaseName() {
  const encoded = normalizeUrl(els.url.value);
  try {
    const host = new URL(encoded).hostname.replace(/^www\./, "");
    if (host) return "qr-" + host.replace(/[^a-z0-9.-]/gi, "-");
  } catch (_) {}
  return "qr-code";
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadSvg() {
  if (!current) return;
  const svg = buildSvg(current.matrix, current.fg, current.bg, current.transparent);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, fileBaseName() + ".svg");
}

function downloadPng() {
  if (!current) return;
  const { matrix, fg, bg, transparent } = current;
  const count = matrix.length;
  const total = count + QUIET_ZONE * 2;
  const scale = Math.max(1, Math.floor(PNG_SIZE / total));
  const px = total * scale;

  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d");

  if (!transparent) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, px, px);
  }

  ctx.fillStyle = fg;
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (matrix[r][c]) {
        ctx.fillRect((c + QUIET_ZONE) * scale, (r + QUIET_ZONE) * scale, scale, scale);
      }
    }
  }

  canvas.toBlob((blob) => downloadBlob(blob, fileBaseName() + ".png"), "image/png");
}

// ---- Synchronisation color picker <-> champ hex ----

function syncColor(picker, hexInput) {
  picker.addEventListener("input", () => {
    hexInput.value = picker.value.toUpperCase();
    render();
  });
  hexInput.addEventListener("input", () => {
    let v = hexInput.value.trim();
    if (v && v[0] !== "#") v = "#" + v;
    if (isValidHex(v)) {
      picker.value = v;
      render();
    }
  });
}

// ---- Initialisation ----

syncColor(els.fg, els.fgHex);
syncColor(els.bg, els.bgHex);
els.url.addEventListener("input", render);
els.transparent.addEventListener("change", render);
els.dlPng.addEventListener("click", downloadPng);
els.dlSvg.addEventListener("click", downloadSvg);

render();
