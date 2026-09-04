import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('alejost-progress')
export class AlejostProgress extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: relative;
      overflow: hidden;
      width: 100%;
      height: var(--progress-height, 4px);
      background-color: var(--progress-container-color, rgba(255, 255, 255, 0.08));
    }

    .progress-bar {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
      background-color: var(--progress-active-color, var(--app-accent-color, #2196f3));
      transform-origin: left center;
      transform: scaleX(0);
      will-change: transform;
    }

    :host([indeterminate]) .progress-bar {
      width: 50%;
      transform: scaleX(1);
      animation: indeterminate-loop 1.6s infinite cubic-bezier(0.65, 0, 0.35, 1);
    }

    @keyframes indeterminate-loop {
      0% {
        transform: translateX(-100%) scaleX(0.2);
      }
      50% {
        transform: translateX(50%) scaleX(0.6);
      }
      100% {
        transform: translateX(200%) scaleX(0.2);
      }
    }
  `;

  @property({ type: Number }) value = 0;
  @property({ type: Number }) max = 100;
  @property({ type: Boolean, reflect: true }) indeterminate = false;

  render() {
    const ratio = this.max > 0 ? Math.min(Math.max(this.value / this.max, 0), 1) : 0;
    const transitionStyle =
      this.value === 0
        ? 'transition: none;'
        : 'transition: transform var(--progress-transition-duration, 0.8s) var(--progress-transition-timing-function, cubic-bezier(0.65, 0, 0.07, 1));';

    return html`
      <div
        class="progress-bar"
        style="${this.indeterminate ? '' : `transform: scaleX(${ratio}); ${transitionStyle}`}"
      ></div>
    `;
  }
}

