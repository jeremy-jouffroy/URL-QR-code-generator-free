# URL QR Code Generator — Free

Générateur de QR code d'URL **gratuit**, 100 % côté navigateur. Aucune donnée n'est envoyée à un serveur : tout est calculé localement en JavaScript.

👉 **Démo en ligne :** https://jeremy-jouffroy.github.io/URL-QR-code-generator-free/

## Fonctionnalités

- **URL de destination** — saisissez n'importe quelle adresse (le `https://` est ajouté automatiquement si absent).
- **Couleur du QR code** + **couleur de fond** (color picker + champ hexadécimal).
- **Fond transparent** optionnel.
- **Avertissement de contraste** quand les couleurs risquent de rendre le code illisible.
- **Export PNG haute résolution (1024 px)** — idéal pour le web et **PowerPoint**.
- **Export SVG vectoriel** — qualité infinie pour l'impression et l'affichage.
- **Application installable (PWA)** — bouton « Installer » (Chrome/Edge) ou « Ajouter à l'écran d'accueil » (mobile), lancement en fenêtre autonome et **fonctionnement 100 % hors-ligne**.
- **Lien partageable** — le bouton « Copier le lien de partage » génère une URL qui rouvre l'app avec exactement les mêmes réglages.

## Pré-remplissage par URL

L'app lit les paramètres de l'URL au chargement et remplit le formulaire automatiquement :

```
https://jeremy-jouffroy.github.io/URL-QR-code-generator-free/?url=https://www.google.com&fg=FFFFFF&bg=000000
```

| Paramètre | Rôle | Exemple |
|---|---|---|
| `url` | URL de destination encodée dans le QR | `url=https://exemple.com` |
| `fg` | couleur du QR (hex, avec ou sans `#`) | `fg=FFFFFF` |
| `bg` | couleur de fond (hex) | `bg=000000` |
| `transparent` | fond transparent (`1` / `true`) | `transparent=1` |

## Stack

Pur **HTML / CSS / JavaScript**, sans build ni dépendance serveur. La génération du QR
repose sur la librairie [`qrcode-generator`](https://github.com/kazuhikoarase/qrcode-generator)
de Kazuhiko Arase (licence MIT), vendorée dans `qrcode.js`.

```
index.html             structure de la page
style.css              mise en forme
app.js                 logique (génération, aperçu, export PNG/SVG, install PWA)
qrcode.js              librairie d'encodage QR (vendorée)
manifest.webmanifest   métadonnées PWA (nom, couleurs, icônes)
sw.js                  service worker (cache app shell → hors-ligne)
icon-*.png             icônes de l'app (générées via gen-icons.js)
gen-icons.js           script utilitaire de génération des icônes
```

## Utilisation locale

Ouvrez simplement `index.html` dans un navigateur, ou servez le dossier :

```bash
python3 -m http.server 8000
# puis http://localhost:8000
```

## Déploiement (GitHub Pages)

Le site est entièrement statique. Activez GitHub Pages sur la branche `main`
(dossier racine `/`) et c'est en ligne.

## Licence

Code de ce projet : MIT. Librairie `qrcode.js` : MIT (Kazuhiko Arase).
