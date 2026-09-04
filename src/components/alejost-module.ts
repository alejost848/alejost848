import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared-styles.js';

@customElement('alejost-module')
export class AlejostModule extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
        margin-top: 50px;
      }

      .module-header {
        margin-bottom: 16px;
        min-height: 54px;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }

      .module-grid {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        margin: -5px;
      }

      @media (max-width: 480px) {
        .module-grid {
          margin: -3px;
        }
      }
    `,
  ];

  @property({ type: String }) moduleTitle = '';
  @property({ type: String }) moduleHref = '';

  render() {
    return html`
      <div class="module-header">
        <h2>${this.moduleTitle}</h2>
        ${this.moduleHref
          ? html`
              <a href="${this.moduleHref}" class="link">
                <button class="button raised">View all</button>
              </a>
            `
          : ''}
      </div>
      <div class="module-grid">
        <slot></slot>
      </div>
    `;
  }
}
