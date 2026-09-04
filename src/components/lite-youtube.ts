import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('lite-youtube')
export class LiteYouTube extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
      background-color: #000;
      overflow: hidden;
      cursor: pointer;
    }

    .poster-image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.3s ease, filter 0.3s ease;
    }

    :host(:hover) .poster-image {
      transform: scale(1.02);
      filter: brightness(1.05);
    }

    .play-btn {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 68px;
      height: 48px;
      background: rgba(33, 33, 33, 0.8);
      border-radius: 12px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
      z-index: 2;
    }

    :host(:hover) .play-btn {
      background-color: #f00;
      transform: translate(-50%, -50%) scale(1.1);
      box-shadow: 0 6px 20px rgba(255, 0, 0, 0.4);
    }

    .play-triangle {
      width: 0;
      height: 0;
      border-style: solid;
      border-width: 9px 0 9px 16px;
      border-color: transparent transparent transparent #fff;
      margin-left: 2px;
    }

    iframe {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border: none;
    }
  `;

  @property({ type: String }) videoId = '';
  @property({ type: String }) videoTitle = '';
  @state() private activated = false;

  private activateVideo() {
    this.activated = true;
  }

  render() {
    if (this.activated) {
      return html`
        <iframe
          src="https://www.youtube-nocookie.com/embed/${this.videoId}?autoplay=1&rel=0"
          title="${this.videoTitle || 'YouTube video'}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      `;
    }

    const posterUrl = `https://i.ytimg.com/vi/${this.videoId}/hqdefault.jpg`;

    return html`
      <div @click="${this.activateVideo}" aria-label="Play video">
        <img
          class="poster-image"
          src="${posterUrl}"
          alt="${this.videoTitle || 'Video thumbnail'}"
          loading="lazy"
        />
        <button class="play-btn" aria-label="Play">
          <div class="play-triangle"></div>
        </button>
      </div>
    `;
  }
}
