import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared-styles.js';
import { singleViewStyles } from '../styles/single-view-styles.js';
import { fetchPathOnce } from '../services/firebase.js';
import { formatTimeAgo } from '../components/alejost-card.js';
import '../components/alejost-share.js';
import '../components/lite-youtube.js';

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

  connectedCallback() {
    super.connectedCallback();
    this.loadTutorial();
  }

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('series') || changedProperties.has('slug')) {
      this.loadTutorial();
    }
  }

  private async loadTutorial() {
    if (!this.series || !this.slug) return;
    this.loading = true;

    const videos = await fetchPathOnce(`/tutorials/${this.series}/videos`);
    if (videos) {
      const match = Object.values(videos).find(
        (v: any) => v.slug === this.slug || v.key === this.slug
      );
      this.tutorial = match || null;
      if (this.tutorial?.title) {
        document.title = `${this.tutorial.title} - Alejandro Sanclemente`;
      }
    } else {
      this.tutorial = null;
    }
    this.loading = false;
  }

  private linkify(text: string) {
    if (!text) return '';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(
      urlRegex,
      (url) => `<a href="${url}" target="_blank" rel="noopener">${url}</a>`
    );
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
                  .videoId="${this.tutorial.videoId}"
                  .videoTitle="${this.tutorial.title}"
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
          ></div>
        </div>
      </div>
    `;
  }
}
