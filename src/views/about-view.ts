import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared-styles.js';
import { renderIcon } from '../components/alejost-icons.js';

@customElement('about-view')
export class AboutView extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
        width: 100%;
      }

      .cards-container {
        display: flex;
        flex-direction: row;
        gap: 20px;
        margin-bottom: 20px;
      }

      .card-group {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .card {
        border-radius: 4px;
        padding: 30px;
        background-color: var(--card-bg-color);
        box-shadow: var(--shadow-elevation-2dp);
        display: flex;
        flex-direction: column;
      }

      .flat-btn {
        margin-top: 24px;
        align-self: flex-start;
        padding: 0;
        color: var(--app-accent-color);
        text-transform: uppercase;
        font-weight: 500;
        font-size: 14px;
        text-decoration: none;
        display: inline-block;
      }

      .form-group {
        margin-bottom: 16px;
        display: flex;
        flex-direction: column;
        width: 100%;
      }

      .form-group label {
        font-size: 12px;
        color: #888;
        margin-bottom: 6px;
      }

      .form-input {
        background: transparent;
        border: none;
        border-bottom: 1px solid var(--form-border-color, rgba(255, 255, 255, 0.2));
        color: var(--page-title-color);
        font-size: 16px;
        padding: 8px 0;
        outline: none;
        font-family: inherit;
        transition: border-bottom-color 0.2s ease;
      }

      .form-input:focus {
        border-bottom-color: var(--app-accent-color);
      }

      textarea.form-input {
        resize: vertical;
        min-height: 80px;
      }

      .theme-card {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }

      .switch {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
      }

      .switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .slider-round {
        position: absolute;
        cursor: pointer;
        inset: 0;
        background-color: #555;
        transition: 0.3s;
        border-radius: 24px;
      }

      .slider-round:before {
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

      input:checked + .slider-round {
        background-color: var(--app-accent-color);
      }

      input:checked + .slider-round:before {
        transform: translateX(20px);
      }

      .credits-card {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }

      .social-icons {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .social-icon-btn {
        color: var(--header-color);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px;
        border-radius: 50%;
        transition: background-color 0.2s ease, transform 0.1s ease;
      }

      .social-icon-btn:hover {
        background-color: rgba(255, 255, 255, 0.1);
        transform: scale(1.1);
      }

      @media (max-width: 900px) {
        .cards-container {
          flex-direction: column;
        }
      }

      @media (max-width: 600px) {
        .card {
          padding: 20px;
        }
        .credits-card {
          flex-direction: column;
          gap: 16px;
          text-align: center;
        }
      }
    `,
  ];

  @property({ type: String }) theme = 'dark';
  @state() private sending = false;
  @state() private formName = '';
  @state() private formEmail = '';
  @state() private formSubject = '';
  @state() private formMessage = '';

  private toggleTheme(e: Event) {
    const isChecked = (e.target as HTMLInputElement).checked;
    const newTheme = isChecked ? 'dark' : 'light';
    this.dispatchEvent(
      new CustomEvent('theme-changed', {
        detail: { theme: newTheme },
        bubbles: true,
        composed: true,
      })
    );
  }

  private async handleSubmit(e: Event) {
    e.preventDefault();
    if (!this.formEmail || !this.formSubject || !this.formMessage) {
      this.toast('Please fill in all required fields.');
      return;
    }

    this.sending = true;

    try {
      const res = await fetch('/submitForm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.formName,
          email: this.formEmail,
          subject: this.formSubject,
          message: this.formMessage,
        }),
      });

      if (res.ok) {
        this.toast('Message sent successfully!');
        this.formName = '';
        this.formEmail = '';
        this.formSubject = '';
        this.formMessage = '';
      } else {
        this.toast('Could not send message. Please try again later.');
      }
    } catch (err) {
      this.toast('Could not send message. Please try again later.');
    } finally {
      this.sending = false;
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
    const year = new Date().getFullYear();

    return html`
      <h1>About</h1>

      <div class="cards-container">
        <div class="card-group">
          <div class="card">
            <h2>alejo.st</h2>
            <p style="margin-top: 12px;">
              This website is a Progressive Web App built with Lit and web standards.
              Database, authentication, and cloud messaging are powered by Firebase.
            </p>
            <a
              class="flat-btn"
              href="https://medium.com/@alejost848/building-my-portfolio-website-part-1-e72a39bb7b2f"
              target="_blank"
              rel="noopener"
            >
              Read more
            </a>
          </div>

          <div class="card">
            <h2>Alejandro Sanclemente</h2>
            <p style="margin-top: 12px;">
              I'm an Interactive Media Designer based in Tuluá, Colombia. I specialize in motion design, UX design, and development of high-performance web applications using modern Web Components and Firebase.
              <br /><br />
              Other topics of my interest are branding, the future of the web platform, and space-related stuff.
              <br /><br />
              I'm available for hiring. Contact me for more information.
            </p>
            <a
              class="flat-btn"
              href="https://docs.google.com/document/d/1AE2Rjhj611kTnwHVvazgWS0EKrr2yZHRErkT3sXqsd8/edit?usp=sharing"
              target="_blank"
              rel="noopener"
            >
              See resume
            </a>
          </div>
        </div>

        <div class="card-group">
          <div class="card" id="contact_card">
            <h2>Contact</h2>
            <p style="margin-top: 8px; margin-bottom: 20px;">
              Need more information or a quote? Fill in the form below:
            </p>

            <form @submit="${this.handleSubmit}">
              <div class="form-group">
                <label>Name (optional)</label>
                <input
                  class="form-input"
                  type="text"
                  .value="${this.formName}"
                  @input="${(e: any) => (this.formName = e.target.value)}"
                />
              </div>

              <div class="form-group">
                <label>Email *</label>
                <input
                  class="form-input"
                  type="email"
                  required
                  .value="${this.formEmail}"
                  @input="${(e: any) => (this.formEmail = e.target.value)}"
                />
              </div>

              <div class="form-group">
                <label>Subject *</label>
                <input
                  class="form-input"
                  type="text"
                  required
                  .value="${this.formSubject}"
                  @input="${(e: any) => (this.formSubject = e.target.value)}"
                />
              </div>

              <div class="form-group">
                <label>Message *</label>
                <textarea
                  class="form-input"
                  required
                  rows="4"
                  .value="${this.formMessage}"
                  @input="${(e: any) => (this.formMessage = e.target.value)}"
                ></textarea>
              </div>

              <div style="margin-top: 16px;">
                <button type="submit" class="button raised" ?disabled="${this.sending}">
                  ${this.sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div class="cards-container">
        <div class="card-group">
          <div class="card theme-card">
            <span style="font-weight: 500;">Dark theme</span>
            <label class="switch">
              <input
                type="checkbox"
                ?checked="${this.theme !== 'light'}"
                @change="${this.toggleTheme}"
              />
              <span class="slider-round"></span>
            </label>
          </div>
        </div>

        <div class="card-group">
          <div class="card credits-card">
            <span style="color: var(--card-date-color); font-size: 14px;">
              © ${year} Alejandro Sanclemente
            </span>
            <div class="social-icons">
              <a
                href="https://youtube.com/alejost848"
                target="_blank"
                rel="noopener"
                class="social-icon-btn"
                title="YouTube"
              >
                ${renderIcon('youtube', 20)}
              </a>
              <a
                href="https://github.com/alejost848"
                target="_blank"
                rel="noopener"
                class="social-icon-btn"
                title="GitHub"
              >
                ${renderIcon('github', 20)}
              </a>
              <a
                href="https://twitter.com/alejost848"
                target="_blank"
                rel="noopener"
                class="social-icon-btn"
                title="Twitter / X"
              >
                ${renderIcon('twitter', 20)}
              </a>
              <a
                href="https://dribbble.com/alejost848"
                target="_blank"
                rel="noopener"
                class="social-icon-btn"
                title="Dribbble"
              >
                ${renderIcon('dribbble', 20)}
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
