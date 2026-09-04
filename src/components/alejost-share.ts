import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared-styles.js';
import { renderIcon } from './alejost-icons.js';

@customElement('alejost-share')
export class AlejostShare extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
        position: relative;
      }

      .share-fab {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background-color: var(--fab-color, var(--app-accent-color));
        color: white;
        border: none;
        box-shadow: var(--shadow-elevation-2dp);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.8s ease;
      }

      .share-fab:hover {
        box-shadow: var(--shadow-elevation-4dp);
        transform: scale(1.05);
      }

      dialog {
        border: none;
        border-radius: 8px;
        padding: 0;
        background-color: var(--card-bg-color);
        color: var(--card-description-color);
        box-shadow: var(--shadow-elevation-8dp);
        width: 220px;
        overflow: hidden;
      }

      dialog::backdrop {
        background-color: rgba(0, 0, 0, 0.5);
      }

      .dialog-header {
        padding: 12px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }

      .dialog-title {
        font-size: 16px;
        font-weight: 500;
        color: var(--card-title-color);
      }

      .close-btn {
        background: none;
        border: none;
        color: #aaa;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .close-btn:hover {
        color: white;
      }

      .share-links {
        padding: 12px 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .social-link {
        display: flex;
        align-items: center;
        gap: 12px;
        color: var(--card-description-color);
        text-decoration: none;
        font-size: 15px;
        transition: color 0.2s ease;
      }

      .social-link:hover {
        color: var(--app-accent-color);
      }

      @media (max-width: 600px) {
        .share-fab {
          position: fixed;
          bottom: 72px;
          right: 16px;
          z-index: 99;
        }
      }
    `,
  ];

  @property({ type: String }) shareUrl = '';
  @state() private dialogOpen = false;

  private async handleShare() {
    const url = this.shareUrl || window.location.href;
    if (navigator.share && window.isSecureContext) {
      try {
        await navigator.share({ url });
        return;
      } catch (err) {
        // user aborted or not supported
      }
    }

    const dialog = this.renderRoot.querySelector('dialog');
    dialog?.showModal();
  }

  private closeDialog() {
    const dialog = this.renderRoot.querySelector('dialog');
    dialog?.close();
  }

  render() {
    const url = encodeURIComponent(this.shareUrl || window.location.href);

    return html`
      <button class="share-fab" @click="${this.handleShare}" title="Share this content">
        ${renderIcon('share', 24)}
      </button>

      <dialog @click="${(e: MouseEvent) => { if (e.target === e.currentTarget) this.closeDialog(); }}">
        <div class="dialog-header">
          <div class="dialog-title">Share</div>
          <button class="close-btn" @click="${this.closeDialog}">
            ${renderIcon('close', 20)}
          </button>
        </div>
        <div class="share-links">
          <a
            href="https://www.facebook.com/sharer/sharer.php?u=${url}"
            target="_blank"
            rel="noopener"
            class="social-link"
          >
            ${renderIcon('facebook', 20)}
            <span>Facebook</span>
          </a>
          <a
            href="https://twitter.com/intent/tweet?url=${url}"
            target="_blank"
            rel="noopener"
            class="social-link"
          >
            ${renderIcon('twitter', 20)}
            <span>Twitter / X</span>
          </a>
          <a
            href="mailto:?body=${url}"
            target="_blank"
            rel="noopener"
            class="social-link"
          >
            ${renderIcon('email', 20)}
            <span>Email</span>
          </a>
        </div>
      </dialog>
    `;
  }
}
