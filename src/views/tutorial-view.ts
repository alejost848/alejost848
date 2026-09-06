import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared-styles.js';
import { singleViewStyles } from '../styles/single-view-styles.js';
import { fetchPathOnce, getCachedPath } from '../services/firebase.js';
import { updateSeo } from '../services/seo.js';
import { formatTimeAgo } from '../components/alejost-card.js';
import '../components/alejost-progress.js';
import '../components/alejost-share.js';
import '../components/lite-youtube.js';

function extractDominantColor(imgSrc: string): Promise<string> {
  return new Promise((resolve) => {
    if (!imgSrc) return resolve('#333333');
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve('#333333');
        ctx.drawImage(img, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;
        let maxSaturation = 0;
        let bestColor = '#333333';
        let r = 0, g = 0, b = 0, count = 0;

        for (let i = 0; i < data.length; i += 4) {
          const red = data[i], green = data[i + 1], blue = data[i + 2];
          const brightness = (red + green + blue) / 3;
          if (brightness < 30 || brightness > 230) continue;

          const max = Math.max(red, green, blue);
          const min = Math.min(red, green, blue);
          const saturation = max === 0 ? 0 : (max - min) / max;

          if (saturation > maxSaturation) {
            maxSaturation = saturation;
            bestColor = `rgb(${red}, ${green}, ${blue})`;
          }
          r += red;
          g += green;
          b += blue;
          count++;
        }

        if (maxSaturation >= 0.2) {
          resolve(bestColor);
        } else if (count > 0) {
          resolve(`rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`);
        } else {
          resolve('#333333');
        }
      } catch {
        resolve('#333333');
      }
    };
    img.onerror = () => resolve('#333333');
    img.src = imgSrc;
  });
}

@customElement('tutorial-view')
export class TutorialView extends LitElement {
  static styles = [
    sharedStyles,
    singleViewStyles,
    css`
      #episode_duration {
        color: rgba(255, 255, 255, 0.6);
        font-size: 16px;
      }

      .description-text a {
        color: var(--app-accent-color);
        text-decoration: underline;
      }

      .timestamp-link {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: var(--app-accent-color);
        border-radius: 4px;
        padding: 2px 6px;
        font-family: inherit;
        font-size: 13px;
        cursor: pointer;
        margin: 0 2px;
        vertical-align: baseline;
        transition: background-color 0.2s ease, color 0.2s ease;
      }

      .timestamp-link:hover {
        background: var(--app-accent-color);
        color: white;
      }

      @media (max-width: 600px) {
        #episode_duration {
          display: none;
        }
      }
    `,
  ];

  @property({ type: String }) series = '';
  @property({ type: String }) slug = '';

  @state() private tutorial: any = null;
  @state() private loading = true;
  @state() private videoCurrentTime = 0;
  @state() private videoDuration = 100;
  @state() private mainColor = '#333333';

  connectedCallback() {
    super.connectedCallback();
    this.loadTutorial();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    const savedTheme = localStorage.getItem('alejo_theme');
    const isLight = savedTheme ? savedTheme === 'light' : !window.matchMedia('(prefers-color-scheme: dark)').matches;
    const defaultColor = isLight ? '#f5f5f5' : '#191919';
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    metaThemeColor?.setAttribute('content', defaultColor);
  }

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('series') || changedProperties.has('slug')) {
      this.loadTutorial();
    }
  }

  private applyTutorialData(tutorial: any) {
    if (!tutorial) return;
    const title = tutorial.title ? `${tutorial.title} - Alejandro Sanclemente` : 'Tutorial - Alejandro Sanclemente';
    const description = tutorial.shortDescription || tutorial.description || 'Motion design tutorial by Alejandro Sanclemente.';
    const thumbnailUrl = tutorial.thumbnail || (tutorial.videoId ? `https://i.ytimg.com/vi/${tutorial.videoId}/maxresdefault.jpg` : `${window.location.origin}/images/cover.png`);
    const videoUrl = tutorial.videoId ? `https://www.youtube.com/watch?v=${tutorial.videoId}` : `${window.location.origin}/tutorial/${this.series}/${this.slug}`;

    updateSeo({
      title,
      description,
      image: thumbnailUrl,
      url: `${window.location.origin}/tutorial/${this.series}/${this.slug}`,
      type: 'video.other',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: tutorial.title || '',
        description,
        thumbnailUrl: [thumbnailUrl],
        uploadDate: tutorial.publishedDate ? new Date(tutorial.publishedDate).toISOString() : new Date().toISOString(),
        contentUrl: videoUrl,
        embedUrl: tutorial.videoId ? `https://www.youtube.com/embed/${tutorial.videoId}` : undefined,
      },
    });

    if (tutorial.mainColor) {
      this.setMainColor(tutorial.mainColor);
    } else if (tutorial.thumbnail) {
      extractDominantColor(tutorial.thumbnail).then((color) => {
        this.setMainColor(color);
      });
    }
  }

  private async loadTutorial() {
    if (!this.series || !this.slug) return;
    const cachedVideos = getCachedPath<any>(`/tutorials/${this.series}/videos`);
    if (cachedVideos) {
      const match = Object.values(cachedVideos).find(
        (v: any) => v.slug === this.slug || v.key === this.slug
      );
      if (match) {
        this.tutorial = match;
        this.loading = false;
        this.applyTutorialData(match);
      }
    } else {
      this.loading = true;
    }

    const videos = await fetchPathOnce(`/tutorials/${this.series}/videos`);
    if (videos) {
      const match = Object.values(videos).find(
        (v: any) => v.slug === this.slug || v.key === this.slug
      );
      this.tutorial = match || null;
      if (this.tutorial) {
        this.applyTutorialData(this.tutorial);
      }
    } else {
      this.tutorial = null;
    }
    this.loading = false;
  }

  private setMainColor(color: string) {
    this.mainColor = color;
    this.style.setProperty('--progress-color', color);
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    metaThemeColor?.setAttribute('content', color);
    window.dispatchEvent(
      new CustomEvent('accent-color-changed', {
        detail: { color },
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

  private parseTimestampToSeconds(ts: string): number {
    const parts = ts.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return 0;
  }

  private handleDescriptionClick = (e: MouseEvent) => {
    const target = (e.target as HTMLElement)?.closest('.timestamp-link') as HTMLElement | null;
    if (target) {
      e.preventDefault();
      const timeStr = target.dataset.time;
      if (timeStr) {
        const seconds = this.parseTimestampToSeconds(timeStr);
        const yt = this.renderRoot.querySelector('#video') as any;
        yt?.seekTo?.(seconds);
      }
    }
  };

  private linkify(text: string) {
    if (!text) return '';
    // First linkify timestamp chapters: e.g. 05:33 or 1:04:13
    const timestampRegex = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g;
    let formatted = text.replace(
      timestampRegex,
      (ts) => `<button type="button" class="timestamp-link" data-time="${ts}">${ts}</button>`
    );

    // Linkify URLs
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    formatted = formatted.replace(
      urlRegex,
      (url) => `<a href="${url}" target="_blank" rel="noopener">${url}</a>`
    );

    return formatted;
  }

  render() {
    if (this.loading) {
      return html`

        <div id="title_header">
          <div>
            <div class="skeleton" style="height: 32px; width: 320px; margin-bottom: 8px;"></div>
            <div class="skeleton" style="height: 18px; width: 100px;"></div>
          </div>
        </div>

        <div id="card">
          <div id="placeholder_card" class="skeleton"></div>
          <div id="card_content">
            <div class="skeleton" style="height: 14px; width: 100px; margin-bottom: 12px;"></div>
            <div class="skeleton" style="height: 16px; width: 95%; margin-bottom: 8px;"></div>
            <div class="skeleton" style="height: 16px; width: 80%; margin-bottom: 8px;"></div>
            <div class="skeleton" style="height: 16px; width: 60%;"></div>
          </div>
        </div>
      `;
    }

    if (!this.tutorial) {
      return html`
        <div id="title_header">
          <h1>Tutorial not found</h1>
        </div>
        <div id="card">
          <div id="card_content">
            <p>The requested tutorial could not be found.</p>
            <a href="/tutorials" class="button raised" style="margin-top: 16px;">Back to tutorials</a>
          </div>
        </div>
      `;
    }

    const linkedDescription = this.linkify(this.tutorial.description || '');

    return html`
      <div id="title_header">
        <div>
          <h1>${this.tutorial.title}</h1>
          ${this.tutorial.episodeNumber
            ? html`<div id="episode_number">Episode ${this.tutorial.episodeNumber}</div>`
            : ''}
        </div>
        <div class="flex"></div>
        ${this.tutorial.duration
          ? html`<div id="episode_duration">${this.tutorial.duration}</div>`
          : ''}
      </div>

      <div id="card">
        <div id="placeholder_card">
          ${this.tutorial.videoId
            ? html`
                <lite-youtube
                  id="video"
                  .videoId="${this.tutorial.videoId}"
                  .videoTitle="${this.tutorial.title}"
                  .autoload="${true}"
                  @video-progress="${this.handleVideoProgress}"
                ></lite-youtube>

              `
            : html`
                <img
                  src="${this.tutorial.thumbnail || ''}"
                  alt="${this.tutorial.title}"
                />
              `}
        </div>

        <div id="card_content">
          <div class="share_wrapper">
            <alejost-share .shareUrl="${window.location.href}"></alejost-share>
          </div>

          <div id="publishedDate">${formatTimeAgo(this.tutorial.publishedDate)}</div>
          <div
            id="description"
            class="description-text"
            .innerHTML="${linkedDescription}"
            @click="${this.handleDescriptionClick}"
          ></div>
        </div>
      </div>
    `;
  }
}

