import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { sharedStyles } from './styles/shared-styles.js';
import { renderIcon } from './components/alejost-icons.js';
import { Router, RouteMatch } from './router.js';
import { initAuth, setUserTheme } from './services/firebase.js';

import './components/alejost-progress.js';
import './components/alejost-notifications.js';
import './components/alejost-toast.js';

import './views/home-view.js';
import './views/works-view.js';
import './views/work-view.js';
import './views/tutorials-view.js';
import './views/tutorial-view.js';
import './views/about-view.js';
import './views/error-view.js';

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

      #header.single-view-header .header_tab.active::after {
        background-color: #ffffff;
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
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 28px;
        text-transform: uppercase;
        font-size: 14px;
        font-weight: 500;
        letter-spacing: 0.05em;
      }

      .header_tab {
        color: var(--header-color);
        opacity: 0.7;
        text-decoration: none;
        padding: 6px 0;
        position: relative;
        transition: opacity 0.2s ease;
      }

      .header_tab:hover {
        opacity: 1;
      }

      .header_tab.active {
        opacity: 1;
        color: var(--header-color);
      }

      .header_tab.active::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 2px;
        background-color: var(--app-accent-color);
      }

      main {
        position: relative;
        z-index: 1;
        width: 100%;
        max-width: 1100px;
        margin: 0 auto;
        padding: 30px 10px 100px 10px;
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

  get isSingleView(): boolean {
    return this.page === 'work' || this.page === 'tutorial';
  }

  private router!: Router;

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
    this.addEventListener('theme-changed', ((e: CustomEvent) => {
      if (e.detail?.theme) {
        this.applyTheme(e.detail.theme);
      }
    }) as EventListener);

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
    this.router = new Router((match: RouteMatch) => {
      this.page = match.page;
      this.params = match.params;
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

    if (theme === 'light') {
      document.documentElement.style.setProperty('--app-background-color', '#f5f5f5');
      document.documentElement.style.setProperty('--card-bg-color', '#ffffff');
      document.documentElement.style.setProperty('--card-image-bg-color', '#e0e0e0');
      document.documentElement.style.setProperty('--card-title-color', '#212121');
      document.documentElement.style.setProperty('--card-description-color', '#666666');
      document.documentElement.style.setProperty('--page-title-color', '#212121');
      document.documentElement.style.setProperty('--module-title-color', '#333333');
      document.documentElement.style.setProperty('--header-color', '#444444');
      document.documentElement.style.setProperty('--bottom-nav-bg-color', '#ffffff');
    } else {
      document.documentElement.style.setProperty('--app-background-color', '#191919');
      document.documentElement.style.setProperty('--card-bg-color', '#212121');
      document.documentElement.style.setProperty('--card-image-bg-color', '#1e1e1e');
      document.documentElement.style.setProperty('--card-title-color', '#f4f4f4');
      document.documentElement.style.setProperty('--card-description-color', '#aaaaaa');
      document.documentElement.style.setProperty('--page-title-color', '#ffffff');
      document.documentElement.style.setProperty('--module-title-color', '#eeeeee');
      document.documentElement.style.setProperty('--header-color', '#ffffff');
      document.documentElement.style.setProperty('--bottom-nav-bg-color', '#212121');
    }
  }

  private updateTitle() {
    let title = 'Alejandro Sanclemente - Motion Designer and PWA Developer';
    switch (this.page) {
      case 'home':
        title = 'Alejandro Sanclemente - Motion Designer and PWA Developer';
        break;
      case 'works':
        title = 'Works - Alejandro Sanclemente';
        break;
      case 'tutorials':
        title = 'Tutorials - Alejandro Sanclemente';
        break;
      case 'about':
        title = 'About - Alejandro Sanclemente';
        break;
      case 'work':
      case 'tutorial':
        // Individual views set their own document.title once loaded
        break;
      default:
        title = '404 Not Found - Alejandro Sanclemente';
    }
    document.title = title;
  }

  private renderView() {
    switch (this.page) {
      case 'home':
        return html`<home-view></home-view>`;
      case 'works':
        return html`<works-view .category="${this.params.category || 'all'}"></works-view>`;
      case 'work':
        return html`<work-view .slug="${this.params.slug || ''}"></work-view>`;
      case 'tutorials':
        return html`<tutorials-view></tutorials-view>`;
      case 'tutorial':
        return html`
          <tutorial-view
            .series="${this.params.series || ''}"
            .slug="${this.params.slug || ''}"
          ></tutorial-view>
        `;
      case 'about':
        return html`<about-view .theme="${this.theme}"></about-view>`;
      case 'error':
      default:
        return html`<error-view></error-view>`;
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
            >
              Works
            </a>
            <a
              href="/tutorials"
              class="header_tab ${this.page === 'tutorials' || this.page === 'tutorial' ? 'active' : ''}"
            >
              Tutorials
            </a>
            <a
              href="/about"
              class="header_tab ${this.page === 'about' ? 'active' : ''}"
            >
              About
            </a>
          </nav>
          <alejost-notifications .user="${this.user}" .theme="${this.isSingleView ? 'dark' : this.theme}"></alejost-notifications>
        </div>
      </div>

      <main role="main">
        ${this.renderView()}
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
