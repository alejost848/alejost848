import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared-styles.js';
import { subscribeToPath } from '../services/firebase.js';
import '../components/alejost-slider.js';
import '../components/alejost-module.js';
import '../components/alejost-card.js';

// Module-level in-memory cache so home data is preserved across page navigations
let cachedSlider: any[] | null = null;
let cachedWorks: any[] | null = null;
let cachedTutorials: any[] | null = null;

@customElement('home-view')
export class HomeView extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
        width: 100%;
      }
    `,
  ];

  @state() private slider: any[] = cachedSlider || [];
  @state() private works: any[] = cachedWorks || [];
  @state() private tutorials: any[] = cachedTutorials || [];
  @state() private loadingSlider = !cachedSlider;
  @state() private loadingWorks = !cachedWorks;
  @state() private loadingTutorials = !cachedTutorials;

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
    // 1. Slider
    const unsubSlider = subscribeToPath('/home/slider', (data) => {
      this.loadingSlider = false;
      if (data) {
        const list = Array.isArray(data) ? data : Object.values(data);
        this.slider = list;
        cachedSlider = list;
      }
    });
    this.unsubscribes.push(unsubSlider);

    // 2. Latest Works
    const unsubWorks = subscribeToPath(
      '/works',
      (data) => {
        this.loadingWorks = false;
        if (data) {
          const list = Object.entries(data).map(([key, val]: [string, any]) => ({
            ...val,
            key,
          }));
          list.sort((a, b) => (b.publishedDate || 0) - (a.publishedDate || 0));
          const topWorks = list.slice(0, 4);
          this.works = topWorks;
          cachedWorks = topWorks;
        }
      },
      { orderByChild: 'publishedDate', limitToLast: 4 }
    );
    this.unsubscribes.push(unsubWorks);

    // 3. Latest Tutorials
    const unsubTutorials = subscribeToPath(
      '/home/latestTutorials',
      (data) => {
        this.loadingTutorials = false;
        if (data) {
          const list = Object.entries(data).map(([key, val]: [string, any]) => ({
            ...val,
            key,
          }));
          list.sort((a, b) => (b.publishedDate || 0) - (a.publishedDate || 0));
          const topTutorials = list.slice(0, 4);
          this.tutorials = topTutorials;
          cachedTutorials = topTutorials;
        }
      },
      { orderByChild: 'publishedDate', limitToLast: 4 }
    );
    this.unsubscribes.push(unsubTutorials);
  }

  render() {
    return html`
      ${this.loadingSlider
        ? html`<alejost-slider ?skeleton="${true}"></alejost-slider>`
        : html`<alejost-slider .data="${this.slider}"></alejost-slider>`}

      <alejost-module moduleTitle="Latest works" moduleHref="/works">
        ${this.loadingWorks
          ? html`
              <alejost-card ?skeleton="${true}"></alejost-card>
              <alejost-card ?skeleton="${true}"></alejost-card>
              <alejost-card ?skeleton="${true}"></alejost-card>
              <alejost-card ?skeleton="${true}"></alejost-card>
            `
          : this.works.map(
              (work) => html`
                <alejost-card
                  href="/work/${work.slug || work.key}"
                  .data="${work}"
                ></alejost-card>
              `
            )}
      </alejost-module>

      <alejost-module moduleTitle="Latest tutorials" moduleHref="/tutorials">
        ${this.loadingTutorials
          ? html`
              <alejost-card ?skeleton="${true}"></alejost-card>
              <alejost-card ?skeleton="${true}"></alejost-card>
              <alejost-card ?skeleton="${true}"></alejost-card>
              <alejost-card ?skeleton="${true}"></alejost-card>
            `
          : this.tutorials.map(
              (tutorial) => html`
                <alejost-card
                  href="/tutorial/${tutorial.seriesSlug || 'general'}/${tutorial.slug || tutorial.key}"
                  .data="${tutorial}"
                ></alejost-card>
              `
            )}
      </alejost-module>
    `;
  }
}
