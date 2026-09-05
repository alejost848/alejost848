import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared-styles.js';
import { renderIcon } from './alejost-icons.js';
import {
  isSupported,
  onForegroundMessage,
  requestFcmToken,
  saveUserSubscription,
  subscribeToPath,
} from '../services/firebase.js';

@customElement('alejost-notifications')
export class AlejostNotifications extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: inline-block;
        position: relative;
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
        background-color: rgba(128, 128, 128, 0.15);
      }

      .btn-notifications:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      /* Popup */
      .popup {
        position: absolute;
        top: calc(100% + 12px);
        right: -12px;
        width: 300px;
        background-color: var(--card-bg-color, #212121);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        overflow: hidden;
        z-index: 1000;
        opacity: 0;
        transform: translateY(-8px) scale(0.97);
        pointer-events: none;
        transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .popup.open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }

      .popup-video {
        width: 100%;
        height: 140px;
        object-fit: cover;
        display: block;
        background-color: var(--card-image-bg-color, #1e1e1e);
      }

      .popup-content {
        padding: 16px;
      }

      .popup-header {
        display: flex;
        align-items: center;
        margin-bottom: 14px;
      }

      .popup-title {
        font-size: 18px;
        font-weight: 500;
        color: var(--card-title-color, #f4f4f4);
        flex: 1;
      }

      /* Toggle switch */
      .switch {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
        flex-shrink: 0;
      }

      .switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .slider {
        position: absolute;
        cursor: pointer;
        inset: 0;
        background-color: #555;
        transition: 0.3s;
        border-radius: 24px;
      }

      .slider::before {
        position: absolute;
        content: '';
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: 0.3s;
        border-radius: 50%;
      }

      input:checked + .slider {
        background-color: var(--app-accent-color);
      }

      input:checked + .slider::before {
        transform: translateX(20px);
      }

      .popup-body {
        font-size: 13px;
        color: var(--card-description-color, #aaa);
        line-height: 1.5;
      }

      .popup-body ul {
        margin: 8px 0 0;
        padding-left: 18px;
      }

      .popup-body li {
        padding-top: 4px;
      }
    `,
  ];

  @property({ type: Object }) user: any = null;
  @property({ type: String }) theme = 'dark';
  @state() private subscribed = false;
  @state() private supported = false;
  @state() private open = false;
  private unsubscribeMessage: (() => void) | null = null;
  private unsubscribeUserSub: (() => void) | null = null;

  async connectedCallback() {
    super.connectedCallback();
    const messagingSupported = await isSupported();
    this.supported = messagingSupported && 'Notification' in window && 'serviceWorker' in navigator;

    document.addEventListener('click', this.handleOutsideClick);
    document.addEventListener('keydown', this.handleKeyDown);

    // Listen for incoming messages while user is on the site
    this.unsubscribeMessage = onForegroundMessage((payload) => {
      const notification = payload?.notification || {};
      const title = notification.title || 'New notification';
      const clickAction = notification.click_action || payload?.data?.click_action;

      window.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: {
            text: title,
            duration: 6000,
            buttonText: clickAction ? 'Go' : undefined,
            buttonTapHandler: clickAction ? () => { window.location.href = clickAction; } : undefined,
          },
          bubbles: true,
          composed: true,
        })
      );
    });

    this.checkSubscriptionStatus();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this.handleOutsideClick);
    document.removeEventListener('keydown', this.handleKeyDown);
    if (this.unsubscribeMessage) this.unsubscribeMessage();
    if (this.unsubscribeUserSub) this.unsubscribeUserSub();
  }

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('user') && this.user?.uid) {
      this.syncUserSubscription(this.user.uid);
    }
  }

  private syncUserSubscription(uid: string) {
    if (this.unsubscribeUserSub) {
      this.unsubscribeUserSub();
    }
    this.unsubscribeUserSub = subscribeToPath(`/users/${uid}/subscribed`, (val) => {
      if (typeof val === 'boolean') {
        this.subscribed = val;
      }
    });
  }

  private checkSubscriptionStatus() {
    if (this.supported && Notification.permission === 'granted') {
      this.subscribed = true;
    }
  }

  private handleOutsideClick = (e: MouseEvent) => {
    if (this.open && !this.contains(e.composedPath()[0] as Node)) {
      this.open = false;
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.open) {
      this.open = false;
    }
  };

  private togglePopup(e: Event) {
    e.stopPropagation();
    this.open = !this.open;
  }

  private async handleToggle(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    if (!this.supported) return;

    if (checked) {
      if (Notification.permission === 'denied') {
        this.subscribed = false;
        this.toast('Notifications are blocked in your browser settings');
        return;
      }

      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        this.subscribed = true;
        this.toast("You'll get occasional notifications");

        // Obtain FCM token and sync to Firebase Realtime Database
        const token = await requestFcmToken();
        if (this.user?.uid && token) {
          await saveUserSubscription(this.user.uid, token, true);
        }
      } else {
        this.subscribed = false;
        this.toast('To subscribe, allow notifications in your browser');
      }
    } else {
      this.subscribed = false;
      this.toast("You won't receive any new notifications");
      if (this.user?.uid) {
        await saveUserSubscription(this.user.uid, null, false);
      }
    }
  }

  private toast(text: string) {
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
    const titleText = this.subscribed ? 'Notifications active' : 'Get notified';
    const videoSrc = `/images/notifications_${this.theme}.mp4`;

    return html`
      <button
        class="btn-notifications"
        @click="${this.togglePopup}"
        title="${titleText}"
        aria-label="${titleText}"
        aria-expanded="${this.open}"
      >
        ${renderIcon(iconName, 22)}
      </button>

      <div class="popup ${this.open ? 'open' : ''}" role="dialog" aria-label="Notifications settings">
        <video
          class="popup-video"
          src="${videoSrc}"
          autoplay
          loop
          muted
          playsinline
        ></video>

        <div class="popup-content">
          <div class="popup-header">
            <span class="popup-title">Notifications</span>
            <label class="switch" title="Toggle notifications">
              <input
                type="checkbox"
                ?checked="${this.subscribed}"
                @change="${this.handleToggle}"
              />
              <span class="slider"></span>
            </label>
          </div>
          <div class="popup-body">
            If enabled, you'll be notified when:
            <ul>
              <li>Tutorials or works are uploaded <span>(three times a month max.)</span></li>
              <li>A significant change occurs in the web app</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }
}
