import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared-styles.js';

export interface ToastDetail {
  text: string;
  duration?: number;
  buttonText?: string;
  buttonTapHandler?: () => void;
}

@customElement('alejost-toast')
export class AlejostToast extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
        position: fixed;
        bottom: 24px;
        left: 24px;
        z-index: 1000;
        pointer-events: none;
      }

      .toast-container {
        display: flex;
        align-items: center;
        gap: 16px;
        min-width: 288px;
        max-width: 568px;
        padding: 14px 20px;
        background-color: var(--toast-bg-color);
        color: var(--toast-color);
        border-radius: 4px;
        box-shadow: var(--shadow-elevation-8dp);
        opacity: 0;
        transform: translateY(100px);
        transition: opacity 0.3s cubic-bezier(0, 0, 0.2, 1), transform 0.3s cubic-bezier(0, 0, 0.2, 1);
        pointer-events: auto;
      }

      .toast-container.opened {
        opacity: 1;
        transform: translateY(0);
      }

      .toast-text {
        font-size: 14px;
        line-height: 20px;
        flex: 1;
      }

      .toast-action {
        color: var(--app-accent-color);
        font-weight: 500;
        text-transform: uppercase;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 14px;
        padding: 0;
        margin: 0;
        white-space: nowrap;
      }

      @media (max-width: 600px) {
        :host {
          left: 0;
          bottom: calc(56px + env(safe-area-inset-bottom, 0px)); /* above bottom navigation */
          width: 100%;
        }
        .toast-container {
          min-width: 100%;
          border-radius: 0;
          padding: 14px 16px;
        }
      }
    `,
  ];

  @property({ type: Boolean, reflect: true }) opened = false;
  @property({ type: String }) text = '';
  @property({ type: String }) buttonText = '';
  @state() private buttonHandler: (() => void) | null = null;
  private timer: number | null = null;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('show-toast', this.onShowToast as EventListener);
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('show-toast', this.onShowToast as EventListener);
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
  }

  private onOnline = () => {
    // Optionally alert online
  };

  private onOffline = () => {
    this.show({
      text: 'Offline. Some content may not be available.',
      duration: 4000,
    });
  };

  private onShowToast = (e: CustomEvent<ToastDetail>) => {
    this.show(e.detail);
  };

  public show(detail: ToastDetail) {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.text = detail.text;
    this.buttonText = detail.buttonText || '';
    this.buttonHandler = detail.buttonTapHandler || null;
    this.opened = true;

    const duration = detail.duration !== undefined ? detail.duration : 4000;
    if (duration > 0) {
      this.timer = window.setTimeout(() => {
        this.close();
      }, duration);
    }
  }

  public close() {
    this.opened = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private handleAction() {
    if (this.buttonHandler) {
      this.buttonHandler();
    }
    this.close();
  }

  render() {
    return html`
      <div class="toast-container ${this.opened ? 'opened' : ''}">
        <div class="toast-text">${this.text}</div>
        ${this.buttonText
          ? html`<button class="toast-action" @click="${this.handleAction}">${this.buttonText}</button>`
          : ''}
      </div>
    `;
  }
}
