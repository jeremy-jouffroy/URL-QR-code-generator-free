# URL QR Code Generator — Free

A **free** URL QR code generator that runs 100% in the browser. No data is ever sent to a server: everything is computed locally in JavaScript.

👉 **Live demo:** https://jeremy-jouffroy.github.io/URL-QR-code-generator-free/

## Features

- **Destination URL** — enter any address (`https://` is added automatically if missing).
- **QR code color** + **background color** (color picker + hex field).
- **Transparent background** option.
- **Contrast warning** when the chosen colors may make the code unreadable.
- **High-resolution PNG export (1024 px)** — perfect for the web and **PowerPoint**.
- **Vector SVG export** — unlimited quality for print and display.
- **Installable app (PWA)** — "Install" button (Chrome/Edge) or "Add to Home Screen" (mobile), standalone window launch, and **fully offline operation**.
- **Shareable link** — the "Copy share link" button generates a URL that reopens the app with the exact same settings.

## Prefill via URL

The app reads the URL parameters on load and fills the form automatically:

```
https://jeremy-jouffroy.github.io/URL-QR-code-generator-free/?url=https://www.google.com&fg=FFFFFF&bg=000000
```

| Parameter | Purpose | Example |
|---|---|---|
| `url` | destination URL encoded in the QR | `url=https://example.com` |
| `fg` | QR color (hex, with or without `#`) | `fg=FFFFFF` |
| `bg` | background color (hex) | `bg=000000` |
| `transparent` | transparent background (`1` / `true`) | `transparent=1` |

## Stack

Pure **HTML / CSS / JavaScript**, no build step and no server dependency. QR generation
relies on Kazuhiko Arase's [`qrcode-generator`](https://github.com/kazuhikoarase/qrcode-generator)
library (MIT license), vendored in `qrcode.js`.

```
index.html             page structure
style.css              styling
app.js                 logic (generation, preview, PNG/SVG export, PWA install)
qrcode.js              QR encoding library (vendored)
manifest.webmanifest   PWA metadata (name, colors, icons)
sw.js                  service worker (caches the app shell → offline)
icon-*.png             app icons (generated via gen-icons.js)
gen-icons.js           utility script that generates the icons
```

## Local usage

Just open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then http://localhost:8000
```

## Deployment (GitHub Pages)

The site is fully static. Enable GitHub Pages on the `main` branch
(root folder `/`) and it's live.

## License

This project's code: MIT. `qrcode.js` library: MIT (Kazuhiko Arase).
