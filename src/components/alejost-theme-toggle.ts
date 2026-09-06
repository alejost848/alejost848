import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared-styles.js';
import { renderIcon } from './alejost-icons.js';

export type ThemeMode = 'dark' | 'light' | 'auto';

interface ThemeOption {
  id: ThemeMode;
  label: string;
  icon: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  { id: 'dark', label: 'Dark', icon: 'theme-dark' },
  { id: 'light', label: 'Light', icon: 'theme-light' },
  { id: 'auto', label: 'Auto', icon: 'theme-system' },
];

@customElement('alejost-theme-toggle')
export class AlejostThemeToggle extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: inline-block;
        position: relative;
      }

      .btn-theme {
        background: transparent;
        border: none;
        color: var(--header-color);
        cursor: pointer;
        padding: 8px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s ease, transform 0.15s ease;
      }

      .btn-theme:hover {
        background-color: rgba(128, 128, 128, 0.15);
      }

      .btn-theme:active {
        transform: scale(0.92);
      }

      /* Popup Menu */
      .popup {
        position: absolute;
        top: calc(100% + 8px);
        right: -6px;
        min-width: 148px;
        background-color: var(--card-bg-color, #212121);
        border: 1px solid var(--form-border-color, rgba(255, 255, 255, 0.15));
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        padding: 6px;
        z-index: 1000;
        opacity: 0;
        transform: translateY(-6px) scale(0.96);
        pointer-events: none;
        transition: opacity 0.15s ease, transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .popup.open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }

      .theme-option {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        border-radius: 8px;
        border: none;
        background: transparent;
        color: var(--card-title-color, #ffffff);
        font-family: inherit;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        text-align: left;
        width: 100%;
        transition: background-color 0.15s ease, color 0.15s ease;
      }

      .theme-option:hover {
        background-color: rgba(128, 128, 128, 0.12);
      }

      .theme-option.active {
        color: var(--app-accent-color, #2196f3);
        background-color: rgba(33, 150, 243, 0.1);
      }

      .check-icon {
        margin-left: auto;
        display: flex;
        align-items: center;
        opacity: 0;
        color: var(--app-accent-color, #2196f3);
      }

      .theme-option.active .check-icon {
        opacity: 1;
      }
    `,
  ];

  @property({ type: String }) mode: ThemeMode = 'dark';
  @state() private open = false;

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this.handleOutsideClick);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this.handleOutsideClick);
    document.removeEventListener('keydown', this.handleKeyDown);
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

  private selectMode(mode: ThemeMode) {
    this.mode = mode;
    this.open = false;
    this.dispatchEvent(
      new CustomEvent('theme-mode-changed', {
        detail: { mode },
        bubbles: true,
        composed: true,
      })
    );
  }

  private get currentOption(): ThemeOption {
    return THEME_OPTIONS.find((opt) => opt.id === this.mode) || THEME_OPTIONS[0];
  }

  render() {
    const current = this.currentOption;
    const buttonTitle = `Theme: ${current.label} (click to change)`;

    return html`
      <button
        class="btn-theme"
        @click="${this.togglePopup}"
        title="${buttonTitle}"
        aria-label="${buttonTitle}"
        aria-haspopup="true"
        aria-expanded="${this.open}"
      >
        ${renderIcon('theme-contrast', 22)}
      </button>

      <div
        class="popup ${this.open ? 'open' : ''}"
        role="menu"
        aria-label="Theme options"
      >
        ${THEME_OPTIONS.map(
          (opt) => html`
            <button
              class="theme-option ${this.mode === opt.id ? 'active' : ''}"
              role="menuitemradio"
              aria-checked="${this.mode === opt.id}"
              @click="${() => this.selectMode(opt.id)}"
            >
              ${renderIcon(opt.icon, 18)}
              <span>${opt.label}</span>
              <span class="check-icon">${renderIcon('check', 16)}</span>
            </button>
          `
        )}
      </div>
    `;
  }
}
