import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { renderIcon } from './alejost-icons.js';

export interface LightboxImage {
  url: string;
  title?: string;
}

@customElement('alejost-lightbox')
export class AlejostLightbox extends LitElement {
  static styles = css`
    :host {
      display: contents;
    }

    .lightbox-backdrop {
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: rgba(0, 0, 0, 0.94);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .lightbox-backdrop.open {
      opacity: 1;
      pointer-events: auto;
    }

    .top-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: white;
      z-index: 10;
      background: linear-gradient(to bottom, rgba(0, 0, 0, 0.6) 0%, transparent 100%);
    }

    .counter {
      font-size: 15px;
      font-weight: 500;
      letter-spacing: 0.05em;
      opacity: 0.85;
      color: #fff;
    }

    .action-btn {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: white;
      border-radius: 50%;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background-color 0.2s ease, transform 0.15s ease;
      outline: none;
    }

    .action-btn:hover {
      background: rgba(255, 255, 255, 0.25);
      transform: scale(1.08);
    }

    .action-btn:focus-visible {
      outline: 2px solid var(--app-accent-color, #2196f3);
    }

    .main-stage {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 60px 80px;
      box-sizing: border-box;
      user-select: none;
    }

    .image-container {
      position: relative;
      max-width: 100%;
      max-height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .lightbox-image {
      max-width: 90vw;
      max-height: 82vh;
      object-fit: contain;
      border-radius: 4px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
      transition: opacity 0.2s ease, transform 0.2s ease;
    }

    .nav-arrow {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: white;
      border-radius: 50%;
      width: 52px;
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background-color 0.2s ease, transform 0.15s ease;
      z-index: 10;
    }

    .nav-arrow:hover {
      background: rgba(0, 0, 0, 0.8);
      transform: translateY(-50%) scale(1.1);
    }

    .nav-arrow.prev {
      left: 20px;
    }

    .nav-arrow.next {
      right: 20px;
    }

    @media (max-width: 600px) {
      .main-stage {
        padding: 50px 10px;
      }
      .lightbox-image {
        max-width: 96vw;
        max-height: 80vh;
      }
      .nav-arrow {
        width: 40px;
        height: 40px;
      }
      .nav-arrow.prev {
        left: 8px;
      }
      .nav-arrow.next {
        right: 8px;
      }
      .top-bar {
        padding: 12px 16px;
      }
    }
  `;

  @property({ type: Array }) images: (string | LightboxImage)[] = [];
  @property({ type: Boolean }) open = false;
  @property({ type: Number }) currentIndex = 0;

  private touchStartX = 0;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this.handleKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.handleKeyDown);
    document.body.style.overflow = '';
  }

  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has('open')) {
      if (this.open) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.prev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.next();
    }
  };

  public show(index = 0) {
    this.currentIndex = index;
    this.open = true;
  }

  public close() {
    this.open = false;
    this.dispatchEvent(new CustomEvent('lightbox-closed', { bubbles: true, composed: true }));
  }

  public next() {
    if (this.images.length <= 1) return;
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
  }

  public prev() {
    if (this.images.length <= 1) return;
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
  }

  private onTouchStart(e: TouchEvent) {
    this.touchStartX = e.touches[0].clientX;
  }

  private onTouchEnd(e: TouchEvent) {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = this.touchStartX - touchEndX;
    if (Math.abs(diff) > 45) {
      if (diff > 0) this.next();
      else this.prev();
    }
  }

  private onBackdropClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.classList.contains('main-stage') || target.classList.contains('lightbox-backdrop')) {
      this.close();
    }
  }

  render() {
    if (!this.open || !this.images || this.images.length === 0) {
      return html`<div class="lightbox-backdrop"></div>`;
    }

    const current = this.images[this.currentIndex];
    const src = typeof current === 'string' ? current : current?.url || '';
    const title = typeof current === 'string' ? '' : current?.title || '';

    return html`
      <div
        class="lightbox-backdrop open"
        role="dialog"
        aria-modal="true"
        aria-label="Image gallery lightbox"
        @click="${this.onBackdropClick}"
        @touchstart="${this.onTouchStart}"
        @touchend="${this.onTouchEnd}"
      >
        <div class="top-bar">
          <div class="counter">
            ${this.currentIndex + 1} / ${this.images.length}
          </div>
          <button class="action-btn" @click="${this.close}" aria-label="Close lightbox">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="main-stage">
          ${this.images.length > 1
            ? html`
                <button class="nav-arrow prev" @click="${this.prev}" aria-label="Previous image">
                  ${renderIcon('chevron-left', 28)}
                </button>
              `
            : ''}

          <div class="image-container">
            <img
              class="lightbox-image"
              src="${src}"
              alt="${title || `Image ${this.currentIndex + 1}`}"
            />
          </div>

          ${this.images.length > 1
            ? html`
                <button class="nav-arrow next" @click="${this.next}" aria-label="Next image">
                  ${renderIcon('chevron-right', 28)}
                </button>
              `
            : ''}
        </div>
      </div>
    `;
  }
}
