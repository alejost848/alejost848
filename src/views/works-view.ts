import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared-styles.js';
import { subscribeToPath } from '../services/firebase.js';
import '../components/alejost-card.js';

@customElement('works-view')
export class WorksView extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
        width: 100%;
      }

      .category-chips {
        margin-top: 36px;
        margin-bottom: 24px;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 8px;
      }

      .category-chip {
        background-color: var(--chip-background-color);
        color: var(--chip-color);
        height: 32px;
        line-height: 32px;
        font-size: 14px;
        border-radius: 16px;
        padding: 0 16px;
        text-decoration: none;
        transition: background-color 0.2s ease, color 0.2s ease;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border: none;
        font-family: inherit;
      }

      .category-chip:hover {
        background-color: rgba(255, 255, 255, 0.12);
      }

      .category-chip.active {
        font-weight: 500;
        background-color: var(--app-accent-color);
        color: white;
      }

      .works-grid {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        margin: -5px;
      }

      @media (max-width: 480px) {
        .works-grid {
          margin: -3px;
        }
      }
    `,
  ];

  @property({ type: String }) category = 'all';

  @state() private works: any[] = [];
  @state() private categories: Record<string, string> = {};
  @state() private loading = true;

  private unsubscribes: Array<() => void> = [];

  connectedCallback() {
    super.connectedCallback();
    this.subscribeData();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribes.forEach((unsub) => unsub());
    this.unsubscribes = [];
  }

  private subscribeData() {
    const unsubCats = subscribeToPath(
      '/dashboard/autocompleteSuggestions/categories',
      (data) => {
        if (data) {
          this.categories = data;
        }
      }
    );
    this.unsubscribes.push(unsubCats);

    const unsubWorks = subscribeToPath('/works', (data) => {
      this.loading = false;
      if (data) {
        const list = Object.entries(data).map(([key, val]: [string, any]) => ({
          ...val,
          key,
        }));
        list.sort((a, b) => (b.publishedDate || 0) - (a.publishedDate || 0));
        this.works = list;
      }
    });
    this.unsubscribes.push(unsubWorks);
  }

  render() {
    const selectedCat = this.category || 'all';
    const filteredWorks = this.works.filter((work) => {
      if (selectedCat === 'all') return true;
      return work.categories && work.categories[selectedCat];
    });

    const categoryEntries = Object.entries(this.categories);

    return html`
      <h1>Works</h1>

      ${categoryEntries.length > 0
        ? html`
            <div class="category-chips">
              <a
                class="category-chip ${selectedCat === 'all' ? 'active' : ''}"
                href="/works"
              >
                All
              </a>
              ${categoryEntries.map(
                ([key, text]) => html`
                  <a
                    class="category-chip ${selectedCat === key ? 'active' : ''}"
                    href="/works/${key}"
                  >
                    ${text}
                  </a>
                `
              )}
            </div>
          `
        : ''}

      <div class="works-grid">
        ${this.loading
          ? Array.from({ length: 8 }).map(
              () => html`<alejost-card ?skeleton="${true}"></alejost-card>`
            )
          : filteredWorks.map(
              (work) => html`
                <alejost-card
                  href="/work/${work.slug || work.key}"
                  .data="${work}"
                ></alejost-card>
              `
            )}
      </div>
    `;
  }
}
