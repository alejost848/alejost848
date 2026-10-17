import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

// SVG Path definitions for Alejandro's logo
// Pure exterior contour of the avatar (without internal eye cutouts)
const LOGO_OUTER_PATH =
  'M21.19,3.27h-.92s-.09-.04-.09-.09v-.92s-.04-.09-.09-.09H6.09s-.09-.04-.09-.09v-.92s-.04-.09-.09-.09h-3.1s-.09.04-.09.09v16.19s.04.09.09.09h.92s.09.04.09.09v2.01s.04.09.09.09h2.01s.09.04.09.09v2.01s.04.09.09.09h2.01s.09.04.09.09v.92s.04.09.09.09h7.46s.09-.04.09-.09v-.92s.04-.09-.09-.09h2.01s.09-.04.09-.09v-2.01s.04-.09.09-.09h2.01s.09-.04.09-.09v-2.01s.04-.09.09-.09h.92s.09-.04.09-.09V3.36s-.04-.09-.09-.09Z';

const LOGO_HAIR_PATH =
  'M2.81,1.09h3.1s.09.04.09.09v.92s.04.09.09.09h14.01s.09.04.09.09v.92s.04.09.09.09h.92s.09.04.09.09v9.73h-1s-.09-.04-.09-.09v-3.1s-.04-.09-.09-.09h-9.65s-.09-.04-.09-.09v-.92s-.04-.09-.09-.09H3.9s-.09.04-.09.09v4.19s-.04.09-.09.09h-1V1.17s.04-.09.09-.09Z';

const LOGO_FACE_PATH =
  'M3.9,8.73h6.37s.09.04.09.09v.92s.04.09.09.09h9.65s.09.04.09.09v3.1s.04.09.09.09h1v4.28s-.04.09-.09.09h-.92s-.09.04-.09.09v2.01s-.04.09-.09.09h-2.01s-.09.04-.09.09v2.01s-.04.09-.09.09h-2.01s-.09.04-.09.09v.92s-.04.09-.09.09h-7.46s-.09-.04-.09-.09v-.92s-.04-.09-.09-.09h-2.01s-.09-.04-.09-.09v-2.01s-.04-.09-.09-.09h-2.01s-.09-.04-.09-.09v-2.01s-.04-.09-.09-.09h-.92s-.09-.04-.09-.09v-4.28h1s.09-.04.09-.09v-4.19s.04-.09.09-.09Z';

const LOGO_LEFT_EYE_PATH =
  'M5.79,13.55c-.1,0-.17.08-.17.17v3.57c0,.1.08.17.17.17h2.59c.1,0,.17-.08.17-.17v-3.57c0-.1-.08-.17-.17-.17h-2.59Z';

const LOGO_RIGHT_EYE_PATH =
  'M18.34,13.72c0-.1-.08-.17-.17-.17h-2.59c-.1,0-.17.08-.17.17v3.57c0,.1.08.17.17.17h2.59c.1,0,.17-.08.17-.17v-3.57Z';

// Original SVG coordinates are in a 24x24 box
const LOGO_BOX_SIZE = 24;
const DISPLAY_SIZE = 96; // resting size in pixels

function getTransform(scale: number, W: number, H: number): string {
  const tx = W / 2 - (LOGO_BOX_SIZE * scale) / 2;
  const ty = H / 2 - (LOGO_BOX_SIZE * scale) / 2;
  return `translate(${tx} ${ty}) scale(${scale})`;
}

// Easing functions
function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function easeInCubic(t: number): number {
  return t * t * t;
}

function easeInQuart(t: number): number {
  return t * t * t * t;
}

@customElement('alejost-intro')
export class AlejostIntro extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      z-index: 999999;
      pointer-events: all;
      overflow: hidden;
    }

    svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
    }
  `;

  @property({ type: String }) theme = 'dark';
  private rafId: number | null = null;

  firstUpdated() {
    this.runIntroAnimation();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private runIntroAnimation() {
    const svgEl = this.renderRoot.querySelector('#page-intro') as SVGSVGElement | null;
    const bgRect = this.renderRoot.querySelector('#intro-bg') as SVGRectElement | null;
    const maskCover = this.renderRoot.querySelector('#mask-cover') as SVGRectElement | null;
    const maskHole = this.renderRoot.querySelector('#mask-hole') as SVGPathElement | null;
    const logoColorGroup = this.renderRoot.querySelector('#intro-logo-color-group') as SVGGElement | null;

    if (!svgEl || !bgRect || !maskCover || !maskHole || !logoColorGroup) {
      this.finish();
      return;
    }

    // Skip animation for users or bots requesting reduced motion
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.dispatchEvent(new CustomEvent('intro-reveal', { bubbles: true, composed: true }));
      this.finish();
      return;
    }

    const W = window.innerWidth;
    const H = window.innerHeight;

    maskCover.setAttribute('width', String(W));
    maskCover.setAttribute('height', String(H));

    const bgColor = this.theme === 'light' ? '#e5e5e5' : '#111111';
    bgRect.setAttribute('fill', bgColor);

    const restingScale = DISPLAY_SIZE / LOGO_BOX_SIZE;
    const startScale = restingScale * 1.18;
    const endScale = (Math.hypot(W, H) / LOGO_BOX_SIZE) * 7.5;

    const startTransform = getTransform(startScale, W, H);
    maskHole.setAttribute('transform', startTransform);
    logoColorGroup.setAttribute('transform', startTransform);

    // Timeline durations in ms:
    // Phase 1 (0 - 550ms): Scale down smoothly from startScale to restingScale (easeOutQuad)
    // Phase 2 (550 - 800ms): Settle pause at resting size (250ms)
    // Phase 3 (800 - 1700ms): Smoothly expand mask & logo from restingScale to endScale (easeInQuart)
    //   Fade out logoColorGroup from 950ms to 1300ms (easeInCubic)
    const PHASE1_END = 550;
    const PHASE2_END = 800;
    const FADE_START = 950;
    const FADE_END = 1300;
    const TOTAL_DURATION = 1700;

    let startTime: number | null = null;
    let revealDispatched = false;

    const tick = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;

      if (elapsed <= PHASE1_END) {
        const t = easeOutQuad(Math.min(elapsed / PHASE1_END, 1));
        const s = startScale + (restingScale - startScale) * t;
        const transform = getTransform(s, W, H);
        maskHole.setAttribute('transform', transform);
        logoColorGroup.setAttribute('transform', transform);
      } else if (elapsed <= PHASE2_END) {
        const transform = getTransform(restingScale, W, H);
        maskHole.setAttribute('transform', transform);
        logoColorGroup.setAttribute('transform', transform);
      } else {
        if (!revealDispatched) {
          revealDispatched = true;
          this.dispatchEvent(new CustomEvent('intro-reveal', { bubbles: true, composed: true }));
        }

        const p3Elapsed = elapsed - PHASE2_END;
        const p3Duration = TOTAL_DURATION - PHASE2_END;
        const t = easeInQuart(Math.min(p3Elapsed / p3Duration, 1));
        const s = restingScale + (endScale - restingScale) * t;
        const transform = getTransform(s, W, H);
        maskHole.setAttribute('transform', transform);
        logoColorGroup.setAttribute('transform', transform);

        if (elapsed >= FADE_START) {
          const fadeT = easeInCubic(Math.min((elapsed - FADE_START) / (FADE_END - FADE_START), 1));
          logoColorGroup.setAttribute('opacity', String(Math.max(0, 1 - fadeT)));
        }
      }

      if (elapsed < TOTAL_DURATION) {
        this.rafId = requestAnimationFrame(tick);
      } else {
        this.finish();
      }
    };

    this.rafId = requestAnimationFrame(tick);
  }

  private finish() {
    this.rafId = null;
    this.dispatchEvent(new CustomEvent('intro-complete', { bubbles: true, composed: true }));
    this.remove();
  }

  render() {
    return html`
      <svg id="page-intro" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <!-- Fullscreen mask hole through which the underlying website is revealed -->
          <mask id="intro-mask" maskUnits="userSpaceOnUse">
            <rect id="mask-cover" fill="white" x="0" y="0"></rect>
            <path id="mask-hole" fill="black" d="${LOGO_OUTER_PATH}"></path>
          </mask>
        </defs>

        <!-- Solid background with mask hole through which the underlying website is revealed -->
        <rect id="intro-bg" width="100%" height="100%" mask="url(#intro-mask)"></rect>

        <!-- Full color avatar logo -->
        <g id="intro-logo-color-group" opacity="1">
          <!-- Hair (#f0b003) -->
          <path fill="#f0b003" d="${LOGO_HAIR_PATH}"></path>
          <!-- Face (#fec38f) -->
          <path fill="#fec38f" d="${LOGO_FACE_PATH}"></path>
          <!-- Left Eye (#352419) -->
          <path fill="#352419" d="${LOGO_LEFT_EYE_PATH}"></path>
          <!-- Right Eye (#352419) -->
          <path fill="#352419" d="${LOGO_RIGHT_EYE_PATH}"></path>
        </g>
      </svg>
    `;
  }
}
