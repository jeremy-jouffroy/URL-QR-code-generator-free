"use strict";

// ---- Configuration ----
const QUIET_ZONE = 4;        // marge (en modules) autour du QR — requise pour la lisibilité
const EC_LEVEL = "M";        // niveau de correction d'erreur (L, M, Q, H)
const PNG_SIZE = 1024;       // résolution du PNG exporté (px)

// Base canonique pour les liens partagés : toujours la GitHub Page publique,
// afin que le lien fonctionne pour tout le monde (et dans la PWA installée).
const SHARE_BASE = "https://jeremy-jouffroy.github.io/URL-QR-code-generator-free/";

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
  share: document.getElementById("share-link"),
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

// ---- Couleur via valeur (hex avec ou sans #) ----

function setColor(picker, hexInput, raw) {
  let v = String(raw || "").trim();
  if (v && v[0] !== "#") v = "#" + v;
  if (!isValidHex(v)) return false;
  v = v.toUpperCase();
  picker.value = v;
  hexInput.value = v;
  return true;
}

// ---- Pré-remplissage depuis l'URL : ?url=...&fg=...&bg=...&transparent=1 ----

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

// ---- Lien partageable (pointe toujours vers la GitHub Page) ----

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
  els.share.textContent = ok ? "✓ Lien copié !" : "Copie impossible";
  setTimeout(() => {
    els.share.classList.remove("copied");
    els.share.textContent = "🔗 Copier le lien de partage";
  }, 2000);
}

// ---- Initialisation ----

syncColor(els.fg, els.fgHex);
syncColor(els.bg, els.bgHex);
els.url.addEventListener("input", render);
els.transparent.addEventListener("change", render);
els.dlPng.addEventListener("click", downloadPng);
els.dlSvg.addEventListener("click", downloadSvg);
els.share.addEventListener("click", copyShareLink);

applyQueryParams();
render();

// ---- PWA : Service Worker + invite d'installation ----

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

const installBtn = document.getElementById("install-btn");
let deferredPrompt = null;

// L'app est-elle déjà lancée comme application installée (PWA en mode autonome) ?
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
  // Inutile de proposer l'installation si on tourne déjà en mode application.
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

// Si l'app bascule en mode application pendant la session, on masque le CTA.
window.matchMedia("(display-mode: standalone)").addEventListener("change", (e) => {
  if (e.matches && installBtn) installBtn.hidden = true;
});
