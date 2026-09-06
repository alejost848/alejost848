import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { sharedStyles } from './styles/shared-styles.js';
import { renderIcon } from './components/alejost-icons.js';
import { Router, RouteMatch } from './router.js';
import { initAuth, setUserTheme } from './services/firebase.js';
import { updateSeo } from './services/seo.js';

import './components/alejost-progress.js';
import './components/alejost-notifications.js';
import './components/alejost-toast.js';


// Lazy view loaders map
const viewLoaders: Record<string, () => Promise<unknown>> = {
  home: () => import('./views/home-view.js'),
  works: () => import('./views/works-view.js'),
  work: () => import('./views/work-view.js'),
  tutorials: () => import('./views/tutorials-view.js'),
  tutorial: () => import('./views/tutorial-view.js'),
  about: () => import('./views/about-view.js'),
  error: () => import('./views/error-view.js'),
};

// Eagerly preload home view for instant landing
viewLoaders.home();

@customElement('portfolio-app')
export class PortfolioApp extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
        position: relative;
        min-height: 100vh;
        background-color: var(--app-background-color);
        color: var(--page-title-color);
        font-family: 'Google Sans Flex', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      #video_progress {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 462px;
        --progress-height: 462px;
        --progress-container-color: transparent;
        --progress-active-color: rgba(0, 0, 0, 0.08);
        --progress-transition-duration: 0.8s;
        --progress-transition-timing-function: cubic-bezier(0.65, 0, 0.07, 1);
        background-color: var(--progress-color, #333333);
        transition: background-color 0.8s ease;
        mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 60%, rgba(0, 0, 0, 0) 100%);
        -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 60%, rgba(0, 0, 0, 0) 100%);
        z-index: 0;
        pointer-events: none;
      }

      #header {
        position: relative;
        width: 100%;
        z-index: 10;
        background: transparent;
      }

      #header.single-view-header {
        --header-color: #ffffff;
      }



      .app_toolbar {
        width: 100%;
        max-width: 1100px;
        height: 96px;
        margin: 0 auto;
        padding: 0 10px;
        display: flex;
        flex-direction: row;
        align-items: center;
      }

      #header_link {
        margin-right: 20px;
        display: flex;
        align-items: center;
        text-decoration: none;
        color: var(--header-color);
      }

      #header_logo {
        display: flex;
        align-items: center;
      }

      .header_tabs {
        position: relative;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 8px;
        font-size: 15px;
        font-weight: 500;
        margin-right: 8px;
      }

      .header_tab {
        color: var(--header-color);
        opacity: 0.6;
        text-decoration: none;
        padding: 6px 14px;
        position: relative;
        transition: opacity 0.2s ease;
        white-space: nowrap;
      }

      .header_tab:hover {
        opacity: 0.9;
      }

      .header_tab.active {
        opacity: 1;
      }

      /* Sliding indicator — transform/width set directly by JS for reliable transitions */
      .tab-indicator {
        position: absolute;
        bottom: -4px;
        left: 0;
        height: 2px;
        width: 0;
        background-color: var(--app-accent-color);
        border-radius: 1px;
        transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1),
                    width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
      }

      #header.single-view-header .tab-indicator {
        background-color: #ffffff;
      }

      main {
        position: relative;
        z-index: 1;
        width: 100%;
        max-width: 1100px;
        margin: 0 auto;
        padding: 30px 10px 100px 10px;
      }

      main > *[hidden] {
        display: none !important;
      }

      #bottom_nav {
        display: none;
        background-color: var(--bottom-nav-bg-color);
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 56px;
        box-shadow: var(--shadow-elevation-8dp);
        z-index: 999;
      }

      .bottom_nav_items {
        display: flex;
        width: 100%;
        height: 100%;
      }

      .bottom_nav_item {
        flex: 1;
        height: 100%;
        font-size: 11px;
        color: var(--bottom-nav-item-color);
        text-decoration: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        transition: color 0.15s ease;
      }

      .bottom_nav_item.active {
        font-weight: 500;
        color: var(--app-accent-color);
      }

      @media (max-width: 600px) {
        #video_progress {
          height: 200px;
          --progress-height: 200px;
        }
        .header_tabs {
          display: none;
        }
        #bottom_nav {
          display: block;
        }
        main {
          padding: 16px 10px 80px 10px;
        }
      }
    `,
  ];

  @state() private page = 'home';
  @state() private params: Record<string, string> = {};
  @state() private theme = 'dark';
  @state() private user: any = null;
  @state() private videoProgress = 0;
  @state() private videoDuration = 100;
  @state() private accentColor = '#333333';
  @state() private visitedPages = new Set<string>();

  get isSingleView(): boolean {
    return this.page === 'work' || this.page === 'tutorial';
  }

  private router!: Router;
  private indicator: HTMLElement | null = null;

  connectedCallback() {
    super.connectedCallback();

    // Check stored theme or detect OS preference
    const savedTheme = localStorage.getItem('alejo_theme');
    if (savedTheme) {
      this.applyTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.applyTheme(prefersDark ? 'dark' : 'light');
    }

    // Live OS theme listener
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('alejo_theme')) {
        this.applyTheme(e.matches ? 'dark' : 'light');
      }
    });

    // Listen for theme toggle events
    const onThemeChanged = (e: CustomEvent) => {
      if (e.detail?.theme) {
        this.applyTheme(e.detail.theme);
      }
    };
    this.addEventListener('theme-changed', onThemeChanged as EventListener);
    window.addEventListener('theme-changed', onThemeChanged as EventListener);

    // Listen for YouTube playback progress events
    window.addEventListener('video-progress', ((e: CustomEvent) => {
      if (typeof e.detail?.currentTime === 'number') {
        this.videoProgress = e.detail.currentTime;
      }
      if (typeof e.detail?.duration === 'number' && e.detail.duration > 0) {
        this.videoDuration = e.detail.duration;
      }
    }) as EventListener);

    // Listen for project/tutorial accent color changes
    window.addEventListener('accent-color-changed', ((e: CustomEvent) => {
      if (e.detail?.color) {
        this.accentColor = e.detail.color;
        this.style.setProperty('--progress-color', e.detail.color);
      }
    }) as EventListener);

    // Initialize client-side router
    this.router = new Router(async (match: RouteMatch) => {
      // Lazy load view chunk on-demand
      if (viewLoaders[match.page]) {
        await viewLoaders[match.page]();
      }

      this.page = match.page;
      this.params = match.params;
      this.visitedPages = new Set(this.visitedPages).add(match.page);
      this.updateTitle();

      // Reset video progress and accent colors when leaving single view
      if (this.page !== 'work' && this.page !== 'tutorial') {
        this.videoProgress = 0;
        this.videoDuration = 100;
        this.accentColor = '#333333';
        this.style.removeProperty('--progress-color');
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        metaThemeColor?.setAttribute(
          'content',
          this.theme === 'light' ? '#f5f5f5' : '#191919'
        );
      }
    });
    this.router.resolveCurrentRoute();

    // Initialize Firebase Auth
    initAuth((user) => {
      this.user = user;
    });
  }

  private applyTheme(theme: string) {
    this.theme = theme;
    localStorage.setItem('alejo_theme', theme);

    if (this.user?.uid) {
      setUserTheme(this.user.uid, theme);
    }

    const vars: Record<string, string> =
      theme === 'light'
        ? {
            '--app-background-color': '#f2f2f2',
            '--card-bg-color': '#ffffff',
            '--card-image-bg-color': '#eeeeee',
            '--card-title-color': '#444444',
            '--card-description-color': '#888888',
            '--card-date-color': '#606060',
            '--page-title-color': '#555555',
            '--module-title-color': '#666666',
            '--header-color': '#555555',
            '--bottom-nav-bg-color': '#ffffff',
            '--bottom-nav-item-color': '#777777',
            '--chip-background-color': 'rgba(0, 0, 0, 0.07)',
            '--chip-color': 'rgba(0, 0, 0, 0.6)',
            '--form-border-color': 'rgba(0, 0, 0, 0.2)',
            '--form-border-focus-color': 'rgba(0, 0, 0, 0.5)',
          }
        : {
            '--app-background-color': '#191919',
            '--card-bg-color': '#212121',
            '--card-image-bg-color': '#1e1e1e',
            '--card-title-color': '#f4f4f4',
            '--card-description-color': '#aaaaaa',
            '--card-date-color': '#606060',
            '--page-title-color': '#ffffff',
            '--module-title-color': '#eeeeee',
            '--header-color': '#ffffff',
            '--bottom-nav-bg-color': '#212121',
            '--bottom-nav-item-color': '#999999',
            '--chip-background-color': 'rgba(255, 255, 255, 0.05)',
            '--chip-color': 'rgba(255, 255, 255, 0.8)',
            '--form-border-color': 'rgba(255, 255, 255, 0.2)',
            '--form-border-focus-color': 'rgba(255, 255, 255, 0.6)',
          };

    for (const [prop, val] of Object.entries(vars)) {
      document.documentElement.style.setProperty(prop, val);
      this.style.setProperty(prop, val);
    }
  }

  private updateTitle() {
    switch (this.page) {
      case 'home':
        updateSeo({
          title: 'Alejandro Sanclemente - Motion Designer and PWA Developer',
          description: 'Interactive Media Designer based in Tuluá, Colombia. I specialize in motion design, UX design and web development.',
          url: window.location.origin,
          schema: {
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: 'Alejandro Sanclemente',
            jobTitle: 'Motion Designer & Web Developer',
            url: window.location.origin,
            sameAs: [
              'https://youtube.com/alejost848',
              'https://github.com/alejost848',
              'https://x.com/alejost848',
              'https://linkedin.com/in/alejost848',
              'https://dribbble.com/alejost848'
            ]
          }
        });
        break;
      case 'works':
        updateSeo({
          title: 'Works - Alejandro Sanclemente',
          description: 'Explore motion design, UI/UX animation, branding, and interactive projects by Alejandro Sanclemente.',
          url: `${window.location.origin}/works`,
        });
        break;
      case 'tutorials':
        updateSeo({
          title: 'Tutorials - Alejandro Sanclemente',
          description: 'Video tutorials and step-by-step guides on motion design, After Effects, and creative animation.',
          url: `${window.location.origin}/tutorials`,
        });
        break;
      case 'about':
        updateSeo({
          title: 'About - Alejandro Sanclemente',
          description: 'Learn about Alejandro Sanclemente, his background, skills, software expertise, and contact information.',
          url: `${window.location.origin}/about`,
        });
        break;
      case 'work':
      case 'tutorial':
        // Individual views update SEO once their specific item data loads
        break;
      default:
        updateSeo({
          title: '404 Not Found - Alejandro Sanclemente',
          description: "Sorry, we can't find the page you're looking for.",
          url: window.location.href,
        });
    }
  }

  protected firstUpdated() {
    // Create the indicator element once, imperatively — it never lives in the
    // Lit template, so Lit can never destroy or reset its inline styles.
    const nav = this.renderRoot.querySelector('.header_tabs') as HTMLElement | null;
    if (nav) {
      this.indicator = document.createElement('span');
      this.indicator.className = 'tab-indicator';
      nav.appendChild(this.indicator);
      // Place immediately with no transition on first load
      this.updateIndicator(false);

      // Re-place once fonts have loaded or window resizes
      document.fonts?.ready?.then(() => {
        this.updateIndicator(false);
      });
      window.addEventListener('resize', () => {
        this.updateIndicator(false);
      });
    }
  }

  protected updated() {
    // Animate to new position on every subsequent re-render
    this.updateIndicator(true);
  }

  private updateIndicator(animate = true) {
    const nav = this.renderRoot.querySelector('.header_tabs') as HTMLElement | null;
    if (!nav || !this.indicator) return;

    const active = nav.querySelector('.header_tab.active') as HTMLElement | null;
    if (!active) {
      this.indicator.style.width = '0px';
      return;
    }

    const x = active.offsetLeft;
    const w = active.offsetWidth;

    if (!animate) {
      // Suppress transition for the initial placement so it doesn't fly in on load
      this.indicator.style.transition = 'none';
      this.indicator.style.transform = `translateX(${x}px)`;
      this.indicator.style.width = `${w}px`;
      // Force a reflow to commit the position, then restore the transition
      this.indicator.getBoundingClientRect();
      this.indicator.style.transition = '';
    } else {
      // The element's current inline transform/width is the "from" state.
      // Setting new values triggers the CSS transition naturally.
      this.indicator.style.transform = `translateX(${x}px)`;
      this.indicator.style.width = `${w}px`;
    }
  }

  render() {
    return html`
      ${this.isSingleView
        ? html`
            <alejost-progress
              id="video_progress"
              .value="${this.videoProgress}"
              .max="${this.videoDuration}"
            ></alejost-progress>
          `
        : ''}

      <div id="header" class="${this.isSingleView ? 'single-view-header' : ''}">
        <div class="app_toolbar">
          <a href="/" id="header_link" title="Navigate home">
            <div id="header_logo">
              ${renderIcon(this.isSingleView ? 'logo' : 'logo-color', 36)}
            </div>
          </a>
          <span class="flex"></span>
          <nav class="header_tabs">
            <a
              href="/works"
              class="header_tab ${this.page === 'works' || this.page === 'work' ? 'active' : ''}"
            >Works</a>
            <a
              href="/tutorials"
              class="header_tab ${this.page === 'tutorials' || this.page === 'tutorial' ? 'active' : ''}"
            >Tutorials</a>
            <a
              href="/about"
              class="header_tab ${this.page === 'about' ? 'active' : ''}"
            >About</a>
          </nav>
          <alejost-notifications .user="${this.user}" .theme="${this.isSingleView ? 'dark' : this.theme}"></alejost-notifications>
        </div>
      </div>

      <main role="main">
        <home-view ?hidden="${this.page !== 'home'}"></home-view>

        ${this.visitedPages.has('works') || this.page === 'works'
          ? html`<works-view ?hidden="${this.page !== 'works'}" .category="${this.params.category || 'all'}"></works-view>`
          : ''}

        ${this.visitedPages.has('tutorials') || this.page === 'tutorials'
          ? html`<tutorials-view ?hidden="${this.page !== 'tutorials'}"></tutorials-view>`
          : ''}

        ${this.visitedPages.has('about') || this.page === 'about'
          ? html`<about-view ?hidden="${this.page !== 'about'}" .theme="${this.theme}"></about-view>`
          : ''}

        ${this.page === 'work'
          ? html`<work-view .slug="${this.params.slug || ''}"></work-view>`
          : ''}

        ${this.page === 'tutorial'
          ? html`
              <tutorial-view
                .series="${this.params.series || ''}"
                .slug="${this.params.slug || ''}"
              ></tutorial-view>
            `
          : ''}

        ${this.page === 'error'
          ? html`<error-view></error-view>`
          : ''}
      </main>

      <div id="bottom_nav">
        <nav class="bottom_nav_items">
          <a href="/" class="bottom_nav_item ${this.page === 'home' ? 'active' : ''}">
            ${renderIcon('logo', 20)}
            <div>Home</div>
          </a>
          <a
            href="/works"
            class="bottom_nav_item ${this.page === 'works' || this.page === 'work' ? 'active' : ''}"
          >
            ${renderIcon('view-carousel', 20)}
            <div>Works</div>
          </a>
          <a
            href="/tutorials"
            class="bottom_nav_item ${this.page === 'tutorials' || this.page === 'tutorial' ? 'active' : ''}"
          >
            ${renderIcon('subscriptions', 20)}
            <div>Tutorials</div>
          </a>
          <a href="/about" class="bottom_nav_item ${this.page === 'about' ? 'active' : ''}">
            ${renderIcon('info', 20)}
            <div>About</div>
          </a>
        </nav>
      </div>

      <alejost-toast></alejost-toast>
    `;
  }
}
