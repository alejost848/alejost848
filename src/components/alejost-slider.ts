import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared-styles.js';
import { renderIcon } from './alejost-icons.js';
import './alejost-progress.js';

interface SlideItem {
  title?: string;
  image?: string;
  slug?: string;
  type?: string;
  [key: string]: any;
}

@customElement('alejost-slider')
export class AlejostSlider extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
        position: relative;
        overflow: hidden;
        border-radius: 12px;
        height: 480px;
        box-shadow: var(--shadow-elevation-2dp);
        background-color: var(--card-image-bg-color);
        transition: box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        outline: none;
      }

      :host(:focus-visible) {
        outline: 2px solid var(--app-accent-color);
        outline-offset: 4px;
      }

      :host(:hover) {
        box-shadow: var(--shadow-elevation-4dp);
      }

      .carousel-container {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }

      .slides-track {
        display: flex;
        width: 100%;
        height: 100%;
        transition: transform 0.8s cubic-bezier(0.65, 0, 0.07, 1);
      }

      .slide-item {
        min-width: 100%;
        height: 100%;
        position: relative;
        text-decoration: none;
        color: white;
        background-color: var(--card-image-bg-color);
        display: block;
      }

      .slide-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .slide-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          to bottom,
          rgba(0, 0, 0, 0.1) 0%,
          rgba(0, 0, 0, 0) 50%,
          rgba(0, 0, 0, 0.6) 100%
        );
        pointer-events: none;
      }

      .slide-title {
        position: absolute;
        bottom: 26px;
        left: 26px;
        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
        font-size: 22px;
        font-weight: 500;
        color: white;
        z-index: 2;
        max-width: calc(100% - 140px);
      }

      .carousel-dots {
        position: absolute;
        top: 0;
        left: 0;
        padding: 24px;
        display: flex;
        align-items: center;
        gap: 8px;
        z-index: 3;
      }

      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: rgba(255, 255, 255, 0.25);
        cursor: pointer;
        border: none;
        padding: 0;
        transition: background-color 0.4s ease, transform 0.2s ease;
      }

      .dot.active {
        background-color: rgba(255, 255, 255, 0.95);
        transform: scale(1.2);
      }

      .nav-controls {
        position: absolute;
        bottom: 20px;
        right: 20px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 3;
      }

      .nav-button {
        background: rgba(0, 0, 0, 0.4);
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        cursor: pointer;
        transition: background-color 0.2s ease, transform 0.1s ease;
      }

      .nav-button:hover {
        background: rgba(0, 0, 0, 0.7);
        transform: scale(1.05);
      }

      #slider_progress {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 4px;
        pointer-events: none;
        --progress-height: 4px;
        --progress-container-color: transparent;
        --progress-active-color: var(--bottom-nav-item-color, var(--app-accent-color));
        --progress-transition-duration: 0s;
        z-index: 4;
      }

      /* Skeleton placeholder */
      .slider-skeleton {
        width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
      }

      .slider-skeleton-title {
        position: absolute;
        bottom: 26px;
        left: 26px;
        height: 28px;
        width: 40%;
        border-radius: 4px;
      }

      @media (max-width: 780px) {
        :host {
          height: 340px;
        }
        .carousel-dots {
          padding: 14px 20px;
        }
        .slide-title {
          font-size: 18px;
          bottom: 20px;
          left: 18px;
        }
      }

      @media (max-width: 480px) {
        :host {
          height: 230px;
        }
        .dot {
          width: 8px;
          height: 8px;
        }
        .slide-title {
          font-size: 15px;
          bottom: 16px;
          left: 14px;
        }
        .nav-controls {
          bottom: 12px;
          right: 12px;
          gap: 6px;
        }
        .nav-button {
          width: 32px;
          height: 32px;
        }
      }
    `,
  ];

  @property({ type: Array }) data: SlideItem[] = [];
  @property({ type: Boolean }) skeleton = false;
  @state() private currentSlide = 0;
  @state() private progress = 0;
  private timer: number | null = null;
  private touchStartX = 0;

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('tabindex', '0');
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Featured projects carousel');
    this.addEventListener('keydown', this.handleKeyDown);
    this.startAutoPlay();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.handleKeyDown);
    this.stopAutoPlay();
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.prevSlide();
      this.startAutoPlay();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.nextSlide();
      this.startAutoPlay();
    }
  };

  private readonly SLIDE_DURATION = 6000; // ms per slide

  private startAutoPlay() {
    this.stopAutoPlay();
    if (!this.data || this.data.length <= 1) return;

    // Back-calculate startTime so the bar resumes from its current position
    // rather than restarting from 0 on every hover-out.
    const resumeFrom = this.progress; // 0–100
    let startTime: number | null = null;

    const tick = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp - (resumeFrom / 100) * this.SLIDE_DURATION;
      }
      const elapsed = timestamp - startTime;
      this.progress = Math.min((elapsed / this.SLIDE_DURATION) * 100, 100);

      if (elapsed >= this.SLIDE_DURATION) {
        this.nextSlide();
        this.startAutoPlay();
        return;
      }

      this.timer = requestAnimationFrame(tick);
    };

    this.timer = requestAnimationFrame(tick);
  }

  private stopAutoPlay() {
    if (this.timer !== null) {
      cancelAnimationFrame(this.timer);
      this.timer = null;
    }
  }

  private nextSlide() {
    if (!this.data || this.data.length === 0) return;
    this.progress = 0;
    this.currentSlide = (this.currentSlide + 1) % this.data.length;
  }

  private prevSlide() {
    if (!this.data || this.data.length === 0) return;
    this.progress = 0;
    this.currentSlide = (this.currentSlide - 1 + this.data.length) % this.data.length;
  }

  private goToSlide(index: number) {
    this.progress = 0;
    this.currentSlide = index;
    this.startAutoPlay();
  }

  private onTouchStart(e: TouchEvent) {
    this.touchStartX = e.touches[0].clientX;
  }

  private onTouchEnd(e: TouchEvent) {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = this.touchStartX - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) this.nextSlide();
      else this.prevSlide();
      this.startAutoPlay();
    }
  }

  render() {
    if (this.skeleton || !this.data || this.data.length === 0) {
      return html`
        <div class="slider-skeleton skeleton" aria-hidden="true">
          <div class="slider-skeleton-title skeleton"></div>
        </div>
      `;
    }

    const items = Object.values(this.data);

    return html`
      <div
        class="carousel-container"
        @mouseenter="${this.stopAutoPlay}"
        @mouseleave="${this.startAutoPlay}"
        @touchstart="${this.onTouchStart}"
        @touchend="${this.onTouchEnd}"
      >
        <div class="slides-track" style="transform: translateX(-${this.currentSlide * 100}%);">
          ${items.map((slide, index) => {
            const path = `/${slide.type || 'work'}/${slide.slug || ''}`;
            return html`
              <a href="${path}" class="slide-item">
                <img
                  class="slide-image"
                  src="${slide.image}"
                  alt="${slide.title || ''}"
                  loading="${index === 0 ? 'eager' : 'lazy'}"
                  fetchpriority="${index === 0 ? 'high' : 'auto'}"
                />
                <div class="slide-overlay"></div>
                ${slide.title ? html`<div class="slide-title">${slide.title}</div>` : ''}
              </a>
            `;
          })}
        </div>

        <div class="carousel-dots">
          ${items.map(
            (_, i) => html`
              <button
                class="dot ${i === this.currentSlide ? 'active' : ''}"
                @click="${() => this.goToSlide(i)}"
                aria-label="Go to slide ${i + 1}"
              ></button>
            `
          )}
        </div>

        <div class="nav-controls">
          <button
            class="nav-button"
            @click="${() => { this.prevSlide(); this.startAutoPlay(); }}"
            aria-label="Previous slide"
          >
            ${renderIcon('chevron-left', 22)}
          </button>
          <button
            class="nav-button"
            @click="${() => { this.nextSlide(); this.startAutoPlay(); }}"
            aria-label="Next slide"
          >
            ${renderIcon('chevron-right', 22)}
          </button>
        </div>

        <alejost-progress id="slider_progress" .value="${this.progress}" .max="${100}"></alejost-progress>
      </div>
    `;
  }
}
