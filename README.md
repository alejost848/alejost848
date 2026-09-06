# Alejandro Sanclemente — Portfolio & Creative Showcase

[![Deploy to Firebase on Push](https://github.com/alejost848/alejost848/actions/workflows/firebase-deploy.yml/badge.svg)](https://github.com/alejost848/alejost848/actions/workflows/firebase-deploy.yml)
[![Live Site](https://img.shields.io/badge/website-alejo.st-2196f3.svg)](https://alejo.st)

The official portfolio and interactive design showcase of **Alejandro Sanclemente**, Motion Designer and Web Developer based in Tuluá, Colombia.

Live website: **[https://alejo.st](https://alejo.st)**

---

## ⚡ Tech Stack

- **Core & Framework:** [Lit 3.2](https://lit.dev/) (Modern Web Components, Reactive Properties, Shadow DOM)
- **Language:** [TypeScript 5.7](https://www.typescriptlang.org/)
- **Build Tool:** [Vite 6.2](https://vite.dev/) with Rollup vendor chunking
- **Styling:** Modular CSS inside Web Components, [Google Sans Flex](https://fonts.google.com/specimen/Google+Sans+Flex) variable font
- **PWA & Caching:** [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/) (Workbox Service Worker, Offline Asset Precaching)
- **Backend & Cloud:** [Firebase](https://firebase.google.com/)
  - **Hosting:** Global CDN Edge serving with dynamic caching
  - **Realtime Database:** Content management for works, tutorials, and subscription counts
  - **Cloud Functions:** Node.js 20 runtime with modern `firebase-admin` v13 and `firebase-functions` v6
  - **Cloud Storage:** Media storage with automated server-side image compression
  - **Push Notifications:** Firebase Cloud Messaging (FCM v1) Web Push
- **CI / CD:** GitHub Actions automated build and deployment pipeline

---

## ✨ Features

- **Blazing Fast Performance:**
  - Dynamic route code-splitting (`viewLoaders`) reduces initial bundle to ~43 kB.
  - In-memory keep-alive DOM cache for instant, zero-reload page navigation.
  - Native CSS View Transitions API for smooth page morphing.
- **Ambient Visual Polish:**
  - Ambient backdrop header that dynamically adapts to each project's primary accent color with smooth CSS gradient diffusion.
- **Enhanced Media Playback:**
  - High-performance YouTube facade (`<lite-youtube>`) with lazy loading and rAF 60fps progress tracking.
  - Desktop keyboard playback shortcuts:
    - <kbd>Space</kbd> / <kbd>K</kbd>: Play / Pause
    - <kbd>&larr;</kbd> / <kbd>J</kbd>: Jump backward 5 seconds
    - <kbd>&rarr;</kbd> / <kbd>L</kbd>: Jump forward 5 seconds
    - <kbd>M</kbd>: Mute / Unmute toggle
- **SEO & Social Sharing:**
  - Dynamic Open Graph, Twitter Cards, canonical tags, and Schema.org structured data (`Person`, `VideoObject`, `CreativeWork`).
  - Crawler-optimized SSR meta injection with edge CDN caching (`Cache-Control: public, s-maxage=3600`).
  - Standard `robots.txt` and `sitemap.xml`.
- **Accessibility (a11y):**
  - "Skip to main content" keyboard link.
  - High-contrast `:focus-visible` rings.
  - ARIA landmarks and screen-reader navigation labels.
- **Contact Form & Anti-Spam:**
  - Frictionless anti-bot protection using an invisible honeypot and client-side timestamp delta validation (no CAPTCHA interruptions).
- **Web Push Notifications:**
  - FCM Web Push integration with permission prompting, background service worker, and topic syncing (`all`).

---

## 🛠️ Development

### Prerequisites
- Node.js 20 or higher
- npm 10 or higher

### Install Dependencies
```bash
# Install root dependencies
npm install

# Install Cloud Functions dependencies
cd functions && npm install && cd ..
```

### Run Local Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production
```bash
npm run build
```
This compiles the TypeScript code, builds optimized production chunks in `dist/`, and automatically synchronizes `dist/index.html` to `functions/hosting/index.html`.

### Syntax & Type Checking
```bash
# Type check frontend
npx tsc --noEmit

# Syntax check backend functions
cd functions && npm run check
```

---

## 🚀 Deployment

### Automated (Continuous Deployment)
Any commit pushed to the `main` branch automatically triggers the [GitHub Actions workflow](.github/workflows/firebase-deploy.yml), which builds and deploys the latest version to **https://alejo.st**.

```bash
git push origin main
```

### Manual Deployment
You can also deploy directly using the Firebase CLI:
```bash
# Deploy website hosting only
firebase deploy --only hosting

# Deploy backend cloud functions only
firebase deploy --only functions

# Deploy everything
firebase deploy
```

---

## 📄 License
All creative works, animations, and motion design projects © Alejandro Sanclemente. Code available under the [MIT License](LICENSE).
