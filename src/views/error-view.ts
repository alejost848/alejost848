import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared-styles.js';

@customElement('error-view')
export class ErrorView extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
        position: relative;
        min-height: 70vh;
      }

      .circle {
        position: absolute;
        animation: circles_animation 3s ease-in-out infinite alternate;
        animation-timing-function: cubic-bezier(0.6, 0, 0.4, 1);
        opacity: 0.2;
        background-color: var(--chip-background-color);
        border-radius: 50%;
      }

      #circles_container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 0;
        min-height: 500px;
      }

      #small { animation-delay: 0s; width: 300px; height: 300px; }
      #medium { animation-delay: 0.3s; width: 600px; height: 600px; }
      #large { animation-delay: 0.6s; width: 900px; height: 900px; }
      #xlarge { animation-delay: 0.9s; width: 1200px; height: 1200px; }
      #xxlarge { animation-delay: 1.2s; width: 1500px; height: 1500px; }

      #text_container {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 500px;
        text-align: center;
        color: var(--chip-color);
      }

      #large_number {
        font-size: 100px;
        line-height: 100px;
        font-weight: 500;
      }

      #info_text {
        margin-top: 10px;
        opacity: 0.75;
        font-size: 16px;
      }

      #start_button {
        margin-top: 30px;
      }

      @keyframes circles_animation {
        0% { transform: scale(1.0); }
        100% { transform: scale(1.1); }
      }
    `,
  ];

  render() {
    return html`
      <div id="circles_container">
        <div id="small" class="circle"></div>
        <div id="medium" class="circle"></div>
        <div id="large" class="circle"></div>
        <div id="xlarge" class="circle"></div>
        <div id="xxlarge" class="circle"></div>
      </div>

      <div id="text_container">
        <div id="large_number">404</div>
        <div id="info_text">Sorry, we can't find the page you're looking for.</div>
        <a href="/" class="link">
          <button id="start_button" class="button raised">Start here</button>
        </a>
      </div>
    `;
  }
}
