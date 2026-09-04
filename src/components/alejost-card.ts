import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared-styles.js';

export function formatTimeAgo(publishedDate: string | number | undefined): string {
  if (!publishedDate) return '';
  const date = new Date(publishedDate);
  if (isNaN(date.getTime())) return String(publishedDate);

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 24) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;

  const diffMonths = Math.round(diffDays / 30.5);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;

  const diffYears = Math.round(diffDays / 365);
  return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
}

@customElement('alejost-card')
export class AlejostCard extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
        margin: 5px;
        width: calc(25% - 10px);
        border-radius: 4px;
        background-color: var(--card-bg-color);
        overflow: hidden;
        box-shadow: var(--shadow-elevation-2dp);
        transition: box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s ease;
      }

      :host(:hover) {
        box-shadow: var(--shadow-elevation-4dp);
        transform: translateY(-2px);
      }

      .card-link {
        display: flex;
        flex-direction: column;
        height: 100%;
        color: inherit;
        text-decoration: none;
      }

      .image-container {
        position: relative;
        width: 100%;
        height: 170px;
        background-color: var(--card-image-bg-color);
        overflow: hidden;
      }

      .card-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        transition: opacity 0.3s ease;
      }

      .card-content {
        padding: 18px;
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 137px;
      }

      .card-title {
        font-size: 17px;
        line-height: 20px;
        font-weight: 500;
        margin-bottom: 8px;
        color: var(--card-title-color);
      }

      .card-description {
        font-size: 14px;
        line-height: 18px;
        font-weight: 400;
        max-height: 54px;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        color: var(--card-description-color);
      }

      .spacer {
        flex: 1;
      }

      .card-date {
        font-size: 12px;
        margin-top: 12px;
        color: var(--card-date-color);
      }

      @media (max-width: 960px) {
        .card-title {
          font-size: 15px;
          line-height: 18px;
        }
        .card-description {
          font-size: 12px;
          line-height: 15px;
          max-height: 45px;
          -webkit-line-clamp: 2;
        }
        .card-content {
          padding: 14px;
        }
        .image-container {
          height: 150px;
        }
      }

      @media (max-width: 780px) {
        :host {
          width: calc(50% - 10px);
        }
        .card-content {
          padding: 16px;
        }
      }

      @media (max-width: 480px) {
        :host {
          width: calc(50% - 6px);
          margin: 3px;
        }
        .image-container {
          height: 130px;
        }
        .card-title {
          font-size: 14px;
          line-height: 17px;
        }
        .card-content {
          padding: 12px;
          min-height: 104px;
        }
        .card-description {
          font-size: 11px;
          line-height: 14px;
        }
      }

      @media (max-width: 310px) {
        :host {
          width: 100%;
        }
      }
    `,
  ];

  @property({ type: String }) href = '';
  @property({ type: Object }) data: any = null;

  render() {
    if (!this.data) return html``;

    const thumbnail = this.data.thumbnail || this.data.cover || '';
    const title = this.data.title || '';
    const description = this.data.shortDescription || this.data.description || '';
    const dateText = formatTimeAgo(this.data.publishedDate);

    return html`
      <a href="${this.href}" class="card-link">
        <div class="image-container">
          ${thumbnail
            ? html`<img class="card-image" src="${thumbnail}" alt="${title}" loading="lazy" />`
            : html`<div style="width:100%;height:100%;background-color:var(--card-image-bg-color)"></div>`}
        </div>
        <div class="card-content">
          <div class="card-title">${title}</div>
          <div class="card-description">${description}</div>
          <div class="spacer"></div>
          ${dateText ? html`<div class="card-date">${dateText}</div>` : ''}
        </div>
      </a>
    `;
  }
}
