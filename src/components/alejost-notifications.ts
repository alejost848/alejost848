import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared-styles.js';
import { renderIcon } from './alejost-icons.js';

@customElement('alejost-notifications')
export class AlejostNotifications extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: inline-block;
      }

      .btn-notifications {
        background: transparent;
        border: none;
        color: var(--header-color);
        cursor: pointer;
        padding: 8px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s ease, opacity 0.2s ease;
      }

      .btn-notifications:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }

      .btn-notifications:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    `,
  ];

  @property({ type: Object }) user: any = null;
  @property({ type: String }) theme = 'dark';
  @state() private subscribed = false;
  @state() private supported = false;

  connectedCallback() {
    super.connectedCallback();
    this.supported = 'Notification' in window && 'serviceWorker' in navigator;
    if (this.supported && Notification.permission === 'granted') {
      this.subscribed = true;
    }
  }

  private async toggleNotifications() {
    if (!this.supported) return;

    if (Notification.permission === 'granted') {
      this.subscribed = !this.subscribed;
      this.notifyToast(
        this.subscribed
          ? 'Notifications enabled'
          : "You won't receive any new notifications"
      );
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.subscribed = true;
        this.notifyToast('Notifications enabled!');
      } else {
        this.notifyToast('Notification permissions were blocked');
      }
    } else {
      this.notifyToast('Notifications are blocked in your browser settings');
    }
  }

  private notifyToast(text: string) {
    window.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: { text, duration: 4000 },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    if (!this.supported) return html``;

    const iconName = this.subscribed ? 'notifications-active' : 'notifications';
    const titleText = this.subscribed ? 'Notifications active' : 'Turn on notifications';

    return html`
      <button
        class="btn-notifications"
        @click="${this.toggleNotifications}"
        title="${titleText}"
        aria-label="${titleText}"
      >
        ${renderIcon(iconName, 22)}
      </button>
    `;
  }
}
