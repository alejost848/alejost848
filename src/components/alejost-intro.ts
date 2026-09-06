import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { gsap } from 'gsap';

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
const TOTAL_ROWS = 24;

function getTransform(scale: number, W: number, H: number): string {
  const tx = W / 2 - (LOGO_BOX_SIZE * scale) / 2;
  const ty = H / 2 - (LOGO_BOX_SIZE * scale) / 2;
  return `translate(${tx} ${ty}) scale(${scale})`;
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

  firstUpdated() {
    this.runIntroAnimation();
  }

  private runIntroAnimation() {
    const svgEl = this.renderRoot.querySelector('#page-intro') as SVGSVGElement | null;
    const bgRect = this.renderRoot.querySelector('#intro-bg') as SVGRectElement | null;
    const maskCover = this.renderRoot.querySelector('#mask-cover') as SVGRectElement | null;
    const maskHole = this.renderRoot.querySelector('#mask-hole') as SVGPathElement | null;
    const logoColorGroup = this.renderRoot.querySelector('#intro-logo-color-group') as SVGGElement | null;
    const logoOuterSilhouette = this.renderRoot.querySelector('#intro-logo-silhouette') as SVGPathElement | null;
    const clipRows = Array.from(this.renderRoot.querySelectorAll('.pixel-clip-row')) as SVGRectElement[];

    if (!svgEl || !bgRect || !maskCover || !maskHole || !logoColorGroup || !logoOuterSilhouette || clipRows.length === 0) {
      this.finish();
      return;
    }

    const W = window.innerWidth;
    const H = window.innerHeight;

    maskCover.setAttribute('width', String(W));
    maskCover.setAttribute('height', String(H));

    const bgColor = this.theme === 'light' ? '#e5e5e5' : '#111111';
    bgRect.setAttribute('fill', bgColor);

    // Initial scale calculation
    const restingScale = DISPLAY_SIZE / LOGO_BOX_SIZE;
    // Massive diagonal coverage so the expanding mask hole completely clears all screen edges
    const endScale = (Math.hypot(W, H) / LOGO_BOX_SIZE) * 7.5;

    const restingTransform = getTransform(restingScale, W, H);
    maskHole.setAttribute('transform', restingTransform);
    logoColorGroup.setAttribute('transform', restingTransform);
    logoOuterSilhouette.setAttribute('transform', restingTransform);

    const proxyUp = { s: restingScale };
    const rowProxies = clipRows.map((rect) => ({ w: 0, rect }));

    // Master Timeline
    const masterTl = gsap.timeline({
      onComplete: () => {
        this.finish();
      },
    });

    // Phase 1: Horizontal scanline wipe - each row draws across from left to right, staggered from top to bottom
    masterTl.to(rowProxies, {
      w: 24,
      duration: 0.14,
      stagger: 0.022,
      ease: 'power1.out',
      onUpdate: () => {
        for (let i = 0; i < rowProxies.length; i++) {
          rowProxies[i].rect.setAttribute('width', String(rowProxies[i].w));
        }
        logoColorGroup.setAttribute('transform', restingTransform);
        logoOuterSilhouette.setAttribute('transform', restingTransform);
      },
    });

    // Ensure all rows are completely unmasked at 24 before pausing
    masterTl.add(() => {
      for (let i = 0; i < clipRows.length; i++) {
        clipRows[i].setAttribute('width', '24');
      }
    });

    // Phase 2: Brief pause to admire the built pixel avatar
    masterTl.to({}, { duration: 0.25 });

    // Phase 3: Zoom BOTH the logo graphics and the mask hole together outward,
    // dissolving the avatar into the hole as it expands.
    masterTl.to(
      proxyUp,
      {
        s: endScale,
        duration: 0.85,
        ease: 'expo.in',
        onStart: () => {
          this.dispatchEvent(new CustomEvent('intro-reveal', { bubbles: true, composed: true }));
        },
        onUpdate: () => {
          const t = getTransform(proxyUp.s, W, H);
          maskHole.setAttribute('transform', t);
          logoColorGroup.setAttribute('transform', t);
          logoOuterSilhouette.setAttribute('transform', t);
        },
      },
      '>'
    );

    // As the zoom starts, fade out the face features and silhouette into the opening hole
    masterTl.to(
      logoColorGroup,
      {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
      },
      '<0.1'
    );

    masterTl.to(
      logoOuterSilhouette,
      {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
      },
      '<0.05'
    );
  }

  private finish() {
    this.dispatchEvent(new CustomEvent('intro-complete', { bubbles: true, composed: true }));
    this.remove();
  }

  render() {
    return html`
      <svg id="page-intro" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Pixel row-by-row clipPath with 24 individual scanline strips -->
          <clipPath id="pixel-clip" clipPathUnits="userSpaceOnUse">
            ${Array.from({ length: TOTAL_ROWS }, (_, row) => html`
              <rect
                class="pixel-clip-row"
                x="0"
                y="${row}"
                width="0"
                height="1.05"
              ></rect>
            `)}
          </clipPath>

          <!-- Fullscreen mask hole through which the underlying website is revealed -->
          <mask id="intro-mask" maskUnits="userSpaceOnUse">
            <rect id="mask-cover" fill="white" x="0" y="0"></rect>
            <path id="mask-hole" fill="black" d="${LOGO_OUTER_PATH}"></path>
          </mask>
        </defs>

        <!-- Solid background with mask hole through which the underlying website is revealed -->
        <rect id="intro-bg" width="100%" height="100%" mask="url(#intro-mask)"></rect>

        <!-- Wrapper group with clip-path applied in 24x24 coordinate space before transforms -->
        <!-- Base silhouette sitting over hole before zoom -->
        <path
          id="intro-logo-silhouette"
          fill="#f0b003"
          d="${LOGO_OUTER_PATH}"
          opacity="1"
          clip-path="url(#pixel-clip)"
        ></path>

        <!-- Full color pixel avatar logo, revealed row by row by #pixel-clip -->
        <g id="intro-logo-color-group" opacity="1" clip-path="url(#pixel-clip)">
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
