# Visions Tracking

A installable Progressive Web App for tracking daily goals, behaviors, and
incident reports (IR) across residential facilities (House 1–4, House 6).

No build step — it's plain HTML/CSS/JS with ES modules, so GitHub Pages can
serve it directly from the repo root on `main`.

## Data storage

All data (clients, goals, completion history, behavior/IR entries) is stored
locally in the browser via `localStorage`. Nothing is sent to a server, and
data does not sync between devices — each phone/browser that installs the
app keeps its own independent data.

## Deploying to GitHub Pages

1. Merge this branch into `main`.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`.
4. Set **Branch** to `main` and folder to `/ (root)`, then **Save**.
5. GitHub will publish the site at `https://<your-username>.github.io/<repo-name>/`.

## Installing on Android

1. Open the published URL in Chrome on your Android phone.
2. Tap the **⋮** menu → **Add to Home screen** (or use the install banner
   Chrome shows automatically).
3. The app opens full-screen, works offline after the first load, and its
   icon appears on your home screen like a native app.

## Project structure

```
index.html            App shell
manifest.webmanifest  PWA install metadata
sw.js                 Offline caching (service worker)
css/style.css         Design system
js/main.js            Router wiring + header
js/router.js          Minimal hash router
js/storage.js         localStorage data layer
js/utils.js           Date/formatting helpers
js/components/        Modal + toast helpers
js/views/houses.js    Facilities dashboard
js/views/client.js    Clients list, goals, behavior & IR logging
js/views/calendar.js  Integrated goal-completion calendar
js/views/summary.js   Weekly goal performance analysis
icons/                Generated app icons
```
