import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared-styles.js';
import { singleViewStyles } from '../styles/single-view-styles.js';
import { fetchPathOnce } from '../services/firebase.js';
import { formatTimeAgo } from '../components/alejost-card.js';
import { renderIcon } from '../components/alejost-icons.js';
import '../components/alejost-progress.js';
import '../components/alejost-share.js';
import '../components/lite-youtube.js';
import '../components/alejost-lightbox.js';

@customElement('work-view')
export class WorkView extends LitElement {
  static styles = [
    sharedStyles,
    singleViewStyles,
    css`
      .categories-container {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }

      .info-chip {
        background-color: var(--chip-background-color);
        color: var(--chip-color);
        height: 28px;
        line-height: 28px;
        font-size: 13px;
        border-radius: 14px;
        padding: 0 14px;
        display: inline-flex;
        align-items: center;
        text-decoration: none;
      }

      .info-chip.category-chip {
        background-color: rgba(255, 255, 255, 0.1);
        color: white;
        transition: background-color 0.2s ease;
      }

      .info-chip.category-chip:hover {
        background-color: var(--app-accent-color);
      }

      .information-grid {
        display: grid;
        grid-template-columns: 2fr 1.5fr 1.5fr;
        gap: 30px;
        margin-top: 10px;
      }

      .info-group-title {
        color: var(--card-date-color);
        margin-bottom: 8px;
        font-size: 14px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .chips-wrap {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 16px;
      }

      .action-btn {
        margin-top: 20px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background-color: var(--progress-color, var(--app-accent-color));
        color: white;
        text-decoration: none;
        padding: 8px 18px;
        border-radius: 4px;
        font-weight: 500;
        text-transform: uppercase;
        font-size: 14px;
        box-shadow: var(--shadow-elevation-2dp);
        transition: background-color 0.8s ease, box-shadow 0.2s ease, transform 0.1s ease;
      }

      .action-btn:hover {
        box-shadow: var(--shadow-elevation-4dp);
        transform: translateY(-1px);
      }

      .gallery-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 16px;
        margin-top: 16px;
      }

      .gallery-item-wrapper {
        position: relative;
        cursor: pointer;
        border-radius: 12px;
        overflow: hidden;
        background-color: var(--card-image-bg-color);
        aspect-ratio: 16 / 10;
        transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        outline: none;
      }

      .gallery-item-wrapper:hover {
        transform: translateY(-2px) scale(1.02);
        box-shadow: var(--shadow-elevation-4dp);
      }

      .gallery-item-wrapper:focus-visible {
        outline: 2px solid var(--app-accent-color);
        outline-offset: 2px;
      }

      .gallery-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .videos-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 16px;
        margin-top: 16px;
      }

      .video-card-item {
        position: relative;
        width: 100%;
        aspect-ratio: 16 / 9;
        border-radius: 4px;
        overflow: hidden;
        background: var(--card-image-bg-color);
        box-shadow: var(--shadow-elevation-2dp);
      }

      @media (max-width: 800px) {
        .information-grid {
          grid-template-columns: 1fr;
          gap: 20px;
        }
      }

    `,
  ];

  @property({ type: String }) slug = '';
  @state() private work: any = null;
  @state() private loading = true;
  @state() private videoCurrentTime = 0;
  @state() private videoDuration = 100;
  @state() private lightboxOpen = false;
  @state() private lightboxIndex = 0;

  connectedCallback() {
    super.connectedCallback();
    this.loadWork();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    metaThemeColor?.setAttribute('content', '#191919');
  }

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('slug')) {
      this.loadWork();
    }
  }

  private async loadWork() {
    if (!this.slug) return;
    this.loading = true;
    const data = await fetchPathOnce(`/works/${this.slug}`);
    this.work = data;
    this.loading = false;

    if (data?.title) {
      document.title = `${data.title} - Alejandro Sanclemente`;
    }

    const accent = data?.mainColor || '#333333';
    this.style.setProperty('--progress-color', accent);
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    metaThemeColor?.setAttribute('content', accent);
    window.dispatchEvent(
      new CustomEvent('accent-color-changed', {
        detail: { color: accent },
      })
    );
  }

  private handleVideoProgress = (e: CustomEvent) => {
    if (typeof e.detail?.currentTime === 'number') {
      this.videoCurrentTime = e.detail.currentTime;
    }
    if (typeof e.detail?.duration === 'number' && e.detail.duration > 0) {
      this.videoDuration = e.detail.duration;
    }
  };

  private openLightbox(index: number) {
    this.lightboxIndex = index;
    this.lightboxOpen = true;
  }


  private toArray(val: any): string[] {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'object') return Object.values(val);
    return [String(val)];
  }

  render() {
    if (this.loading) {
      return html`

        <div id="title_header">
          <div>
            <div class="skeleton" style="height: 32px; width: 280px; margin-bottom: 8px;"></div>
            <div class="skeleton" style="height: 24px; width: 140px; border-radius: 12px;"></div>
          </div>
        </div>

        <div id="card">
          <div id="placeholder_card" class="skeleton"></div>
          <div id="card_content">
            <div class="skeleton" style="height: 14px; width: 120px; margin-bottom: 12px;"></div>
            <div class="skeleton" style="height: 16px; width: 90%; margin-bottom: 8px;"></div>
            <div class="skeleton" style="height: 16px; width: 75%; margin-bottom: 8px;"></div>
            <div class="skeleton" style="height: 16px; width: 50%;"></div>
          </div>
        </div>
      `;
    }


    if (!this.work) {
      return html`
        <div id="title_header">
          <h1>Work not found</h1>
        </div>
        <div id="card">
          <div id="card_content">
            <p>The requested work could not be found.</p>
            <a href="/works" class="button raised" style="margin-top: 16px;">Back to works</a>
          </div>
        </div>
      `;
    }

    const categories = this.work.categories
      ? Object.entries(this.work.categories).map(([key, value]) => ({
          key,
          value: typeof value === 'string' ? value : key,
        }))
      : [];

    const clients = this.toArray(this.work.clients);
    const tools = this.toArray(this.work.toolsUsed);
    const credits = this.toArray(this.work.credits);
    const galleryImages = this.work.images ? Object.values(this.work.images) : [];

    return html`
      <div id="title_header">
        <div>
          <h1>${this.work.title}</h1>
          ${categories.length > 0
            ? html`
                <div class="categories-container">
                  ${categories.map(
                    (cat) => html`
                      <a href="/works/${cat.key}" class="info-chip category-chip">
                        ${cat.value}
                      </a>
                    `
                  )}
                </div>
              `
            : ''}
        </div>
      </div>

      <div id="card">
        <div id="placeholder_card">
          ${this.work.videoId
            ? html`
                <lite-youtube
                  id="video"
                  .videoId="${this.work.videoId}"
                  .videoTitle="${this.work.title}"
                  .autoload="${true}"
                  @video-progress="${this.handleVideoProgress}"
                ></lite-youtube>
              `
            : html`
                <img
                  src="${this.work.coverImage?.downloadUrl || this.work.thumbnail || ''}"
                  alt="${this.work.title}"
                />
              `}
        </div>

        <div id="card_content">
          <div class="share_wrapper">
            <alejost-share .shareUrl="${window.location.href}"></alejost-share>
          </div>

          <div class="information-grid">
            <div>
              <div id="publishedDate">${formatTimeAgo(this.work.publishedDate)}</div>
              <div id="description">${this.work.shortDescription || this.work.description}</div>
              ${this.work.button
                ? html`
                    <a
                      href="${this.work.button.url}"
                      target="_blank"
                      rel="noopener"
                      class="action-btn"
                    >
                      <span>${this.work.button.text || 'View project'}</span>
                      ${renderIcon('open-in-new', 18)}
                    </a>
                  `
                : ''}
            </div>

            <div>
              ${clients.length > 0
                ? html`
                    <div class="info-group-title">Client</div>
                    <div class="chips-wrap">
                      ${clients.map((c) => html`<div class="info-chip">${c}</div>`)}
                    </div>
                  `
                : ''}
              ${tools.length > 0
                ? html`
                    <div class="info-group-title">Tools Used</div>
                    <div class="chips-wrap">
                      ${tools.map((t) => html`<div class="info-chip">${t}</div>`)}
                    </div>
                  `
                : ''}
            </div>

            <div>
              ${credits.length > 0
                ? html`
                    <div class="info-group-title">Credits</div>
                    <div class="chips-wrap">
                      ${credits.map((cr) => html`<div class="info-chip">${cr}</div>`)}
                    </div>
                  `
                : ''}
            </div>
          </div>

          ${galleryImages.length > 0
            ? html`
                <div style="margin-top: 36px;">
                  <div class="info-group-title">Gallery</div>
                  <div class="gallery-grid">
                    ${galleryImages.map(
                      (img: any, idx: number) => html`
                        <div
                          class="gallery-item-wrapper"
                          @click="${() => this.openLightbox(idx)}"
                          role="button"
                          tabindex="0"
                          aria-label="View gallery image ${idx + 1}"
                          @keydown="${(e: KeyboardEvent) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              this.openLightbox(idx);
                            }
                          }}"
                        >
                          <img
                            class="gallery-image"
                            src="${img.downloadUrl || img.url || img}"
                            loading="lazy"
                            alt="Gallery item ${idx + 1}"
                          />
                        </div>
                      `
                    )}
                  </div>
                </div>

                <alejost-lightbox
                  .images="${galleryImages.map((img: any) => ({
                    url: img.downloadUrl || img.url || img,
                    title: this.work.title,
                  }))}"
                  .open="${this.lightboxOpen}"
                  .currentIndex="${this.lightboxIndex}"
                  @lightbox-closed="${() => (this.lightboxOpen = false)}"
                ></alejost-lightbox>
              `
            : ''}

          ${this.toArray(this.work.videos).length > 0
            ? html`
                <div style="margin-top: 36px;">
                  <div class="info-group-title">Videos</div>
                  <div class="videos-grid">
                    ${this.toArray(this.work.videos).map(
                      (vid: string) => html`
                        <div class="video-card-item">
                          <lite-youtube
                            .videoId="${vid}"
                            .videoTitle="${this.work.title}"
                            .autoload="${false}"
                          ></lite-youtube>
                        </div>
                      `
                    )}
                  </div>
                </div>
              `
            : ''}
        </div>
      </div>
    `;
  }
}

