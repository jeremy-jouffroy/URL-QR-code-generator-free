"use strict";

// ---- Configuration ----
const QUIET_ZONE = 4;        // margin (in modules) around the QR — required for readability
const EC_LEVEL = "M";        // error correction level (L, M, Q, H)
const PNG_SIZE = 1024;       // exported PNG resolution (px)

// Canonical base for shared links: always the public GitHub Page,
// so the link works for everyone (and inside the installed PWA).
const SHARE_BASE = "https://jeremy-jouffroy.github.io/URL-QR-code-generator-free/";

// ---- DOM elements ----
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
  share: document.getElementById("share-link"),
};

// Current QR state (matrix + params) used for export
let current = null;

// ---- Helpers ----

// Prepend https:// when the user did not specify a scheme
function normalizeUrl(raw) {
  const value = raw.trim();
  if (!value) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value; // already has a scheme (https:, mailto:, tel:, etc.)
  return "https://" + value;
}

// Relative luminance, used to estimate contrast
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

// ---- QR generation ----

function buildMatrix(text) {
  const qr = qrcode(0, EC_LEVEL); // 0 = auto type
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

  // Merge contiguous modules in each row into a single rectangle (lighter SVG)
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
  els.encodedHint.textContent = encoded ? "Encodes: " + encoded : "";

  const fg = isValidHex(els.fgHex.value) ? els.fgHex.value : els.fg.value;
  const bg = isValidHex(els.bgHex.value) ? els.bgHex.value : els.bg.value;
  const transparent = els.transparent.checked;

  // Contrast warning
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
    els.encodedHint.textContent = "Text too long for a QR code.";
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

// ---- Color picker <-> hex field sync ----

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

// ---- Set a color from a value (hex with or without #) ----

function setColor(picker, hexInput, raw) {
  let v = String(raw || "").trim();
  if (v && v[0] !== "#") v = "#" + v;
  if (!isValidHex(v)) return false;
  v = v.toUpperCase();
  picker.value = v;
  hexInput.value = v;
  return true;
}

// ---- Prefill from the URL: ?url=...&fg=...&bg=...&transparent=1 ----

function applyQueryParams() {
  const p = new URLSearchParams(window.location.search);
  if (p.has("url")) els.url.value = p.get("url");
  if (p.has("fg")) setColor(els.fg, els.fgHex, p.get("fg"));
  if (p.has("bg")) setColor(els.bg, els.bgHex, p.get("bg"));
  if (p.has("transparent")) {
    const t = p.get("transparent");
    els.transparent.checked = t === "1" || t === "true";
  }
}

// ---- Shareable link (always points to the GitHub Page) ----

function buildShareUrl() {
  const params = new URLSearchParams();
  params.set("url", normalizeUrl(els.url.value));
  params.set("fg", (els.fgHex.value || els.fg.value).replace("#", ""));
  params.set("bg", (els.bgHex.value || els.bg.value).replace("#", ""));
  if (els.transparent.checked) params.set("transparent", "1");
  return SHARE_BASE + "?" + params.toString();
}

async function copyShareLink() {
  const link = buildShareUrl();
  let ok = false;
  try {
    await navigator.clipboard.writeText(link);
    ok = true;
  } catch (e) {
    try {
      const ta = document.createElement("textarea");
      ta.value = link;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ok = document.execCommand("copy");
      ta.remove();
    } catch (_) {
      ok = false;
    }
  }
  els.share.classList.add("copied");
  els.share.textContent = ok ? "✓ Link copied!" : "Copy failed";
  setTimeout(() => {
    els.share.classList.remove("copied");
    els.share.textContent = "🔗 Copy share link";
  }, 2000);
}

// ---- Initialization ----

syncColor(els.fg, els.fgHex);
syncColor(els.bg, els.bgHex);
els.url.addEventListener("input", render);
els.transparent.addEventListener("change", render);
els.dlPng.addEventListener("click", downloadPng);
els.dlSvg.addEventListener("click", downloadSvg);
els.share.addEventListener("click", copyShareLink);

applyQueryParams();
render();

// ---- PWA: Service Worker + install prompt ----

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

const installBtn = document.getElementById("install-btn");
let deferredPrompt = null;

// Is the app already running as an installed app (standalone PWA)?
function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    navigator.standalone === true // iOS Safari
  );
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // No need to offer installation if we're already running as an app.
  if (installBtn && !isStandalone()) installBtn.hidden = false;
});

if (installBtn) {
  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.hidden = true;
  });
}

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  if (installBtn) installBtn.hidden = true;
});

// If the app switches to standalone mode during the session, hide the CTA.
window.matchMedia("(display-mode: standalone)").addEventListener("change", (e) => {
  if (e.matches && installBtn) installBtn.hidden = true;
});
