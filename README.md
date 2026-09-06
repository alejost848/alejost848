# Hi there, I'm Alejandro Sanclemente 👋

<p align="center">
  <a href="https://alejo.st">
    <img src="https://alejo.st/images/cover.png" alt="Alejandro Sanclemente Portfolio Banner" width="100%" />
  </a>
</p>

<p align="center">
  <strong>Interactive Media Designer & Creative Developer</strong> based in Tuluá, Colombia 🇨🇴
</p>

<p align="center">
  <a href="https://alejo.st"><img src="https://img.shields.io/badge/Website-alejo.st-2196f3?style=flat-square&logo=google-chrome&logoColor=white" alt="Website" /></a>
  <a href="https://linkedin.com/in/alejost848"><img src="https://img.shields.io/badge/LinkedIn-alejost848-0A66C2?style=flat-square&logo=linkedin&logoColor=white" alt="LinkedIn" /></a>
  <a href="https://x.com/alejost848"><img src="https://img.shields.io/badge/X-@alejost848-000000?style=flat-square&logo=x&logoColor=white" alt="X" /></a>
  <a href="https://docs.google.com/document/d/1AE2Rjhj611kTnwHVvazgWS0EKrr2yZHRErkT3sXqsd8/edit?usp=sharing"><img src="https://img.shields.io/badge/Resume-Google_Docs-4285F4?style=flat-square&logo=googledocs&logoColor=white" alt="Resume" /></a>
</p>

---

## 🎨 About Me

I specialize in **motion graphics, UI animation, UX design**, and the development of high-performance **Progressive Web Apps** built with modern Web Components and cloud backends.

- 🎬 **Creative & Animation:** After Effects, Motion Graphics, Visual Design, Storyboarding, Video Editing
- 💻 **Frontend Engineering:** Lit 3, Web Components, TypeScript, Vite, CSS View Transitions, PWAs
- ☁️ **Cloud & Backend:** Firebase (Hosting, Cloud Functions Node 20, Realtime DB, Cloud Storage, FCM Web Push)
- 🚀 **Passions:** Creative coding, interactive design, the future of the open web platform, and space exploration.

---

## 🌟 Featured Project: [alejo.st](https://alejo.st)

This repository (`alejost848/alejost848`) is the open-source codebase for my personal portfolio: **[https://alejo.st](https://alejo.st)**.

### ✨ Highlights of the Platform
- **Ultra-Fast & Modular:** Dynamic route code-splitting via Lit loaders reduces the initial JavaScript bundle to **~43 kB**.
- **In-Memory DOM Cache:** Retains visited views in memory for zero-latency, instantaneous page navigation.
- **Ambient Color Dynamics:** Single project pages dynamically tint the ambient backdrop using the project's accent color with smooth CSS gradient masks.
- **Enhanced YouTube Player:** Embedded facade (`<lite-youtube>`) with lazy hydration, 60fps rAF progress interpolation, and desktop keyboard shortcuts (<kbd>Space</kbd>, <kbd>J</kbd>/<kbd>L</kbd>, <kbd>M</kbd>).
- **SEO & Social Sharing:** Dynamic Open Graph, Twitter cards, canonical tags, and Schema.org structured data (`Person`, `VideoObject`, `CreativeWork`) with edge CDN caching.
- **Push Notifications:** Native FCM Web Push integration to notify subscribers whenever a new tutorial or project is published.
- **Frictionless Contact Form:** Spam-protected using an invisible honeypot and client-side timestamp delta validation.

---

<details>
<summary><strong>💻 Developer & Local Setup Guide</strong></summary>

### Prerequisites
- Node.js 20+
- npm 10+

### Setup & Run
```bash
# Clone the repository
git clone https://github.com/alejost848/alejost848.git
cd alejost848

# Install dependencies
npm install
cd functions && npm install && cd ..

# Start Vite development server
npm run dev
```

### Production Build
```bash
npm run build
```
*(Compiles TypeScript, bundles assets into `dist/`, and synchronizes the HTML shell to `functions/hosting/index.html`)*.

### Deployment
Pushes to the `main` branch automatically trigger continuous deployment to Firebase via GitHub Actions:
```bash
git push origin main
```

</details>

---

<p align="center">
  <sub>All creative works, tutorials, and animations © Alejandro Sanclemente. Code released under the <a href="LICENSE">MIT License</a>.</sub>
</p>
