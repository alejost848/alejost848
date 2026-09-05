import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared-styles.js';
import { subscribeToPath } from '../services/firebase.js';
import '../components/alejost-card.js';

// Module-level in-memory cache so works and categories are only fetched once per session
let cachedWorks: any[] | null = null;
let cachedCategories: Record<string, string> | null = null;
let activeSubscription = false;

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
        margin-top: 0;
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
      .category-chip.skeleton-chip {
        width: var(--w, 64px);
        cursor: default;
        pointer-events: none;
      }
    `,
  ];

  @property({ type: String }) category = 'all';

  @state() private works: any[] = cachedWorks || [];
  @state() private categories: Record<string, string> = cachedCategories || {};
  @state() private loading = !cachedWorks;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('popstate', this.handlePopState);
    this.subscribeData();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('popstate', this.handlePopState);
  }

  private handlePopState = () => {
    const match = window.location.pathname.match(/^\/works(?:\/([^/]+))?$/);
    if (match) {
      this.category = match[1] || 'all';
    }
  };

  private selectCategory(e: MouseEvent, cat: string) {
    e.preventDefault();
    if (this.category === cat) return;
    this.category = cat;
    const path = cat === 'all' ? '/works' : `/works/${cat}`;
    window.history.pushState({}, '', path);
  }

  private subscribeData() {
    if (activeSubscription) return;
    activeSubscription = true;

    subscribeToPath(
      '/dashboard/autocompleteSuggestions/categories',
      (data) => {
        if (data) {
          cachedCategories = data;
          this.categories = data;
        }
      }
    );

    subscribeToPath('/works', (data) => {
      this.loading = false;
      if (data) {
        const list = Object.entries(data).map(([key, val]: [string, any]) => ({
          ...val,
          key,
        }));
        list.sort((a, b) => (b.publishedDate || 0) - (a.publishedDate || 0));
        cachedWorks = list;
        this.works = list;
      }
    });
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
                @click="${(e: MouseEvent) => this.selectCategory(e, 'all')}"
              >
                All
              </a>
              ${categoryEntries.map(
                ([key, text]) => html`
                  <a
                    class="category-chip ${selectedCat === key ? 'active' : ''}"
                    href="/works/${key}"
                    @click="${(e: MouseEvent) => this.selectCategory(e, key)}"
                  >
                    ${text}
                  </a>
                `
              )}
            </div>
          `
        : html`
            <div class="category-chips">
              ${[48, 88, 76, 68, 64, 48].map(
                (w) => html`
                  <span
                    class="category-chip skeleton-chip skeleton"
                    style="--w: ${w}px"
                  ></span>
                `
              )}
            </div>
          `}

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
