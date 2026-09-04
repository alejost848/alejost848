import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { sharedStyles } from '../styles/shared-styles.js';
import { subscribeToPath } from '../services/firebase.js';
import '../components/alejost-module.js';
import '../components/alejost-card.js';

@customElement('tutorials-view')
export class TutorialsView extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
        width: 100%;
      }
    `,
  ];

  @state() private seriesList: any[] = [];
  @state() private loading = true;
  private unsubscribe: (() => void) | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribe = subscribeToPath('/tutorials', (data) => {
      this.loading = false;
      if (data) {
        this.seriesList = Object.entries(data).map(([key, val]: [string, any]) => ({
          ...val,
          key,
        }));
      }
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribe?.();
  }

  private toVideosArray(videos: any): any[] {
    if (!videos) return [];
    if (Array.isArray(videos)) return videos.slice().reverse();
    return Object.values(videos).reverse();
  }

  render() {
    return html`
      <h1>Tutorials</h1>

      ${this.loading
        ? html`
            <alejost-module moduleTitle="Loading series...">
              <alejost-card ?skeleton="${true}"></alejost-card>
              <alejost-card ?skeleton="${true}"></alejost-card>
              <alejost-card ?skeleton="${true}"></alejost-card>
              <alejost-card ?skeleton="${true}"></alejost-card>
            </alejost-module>
          `
        : this.seriesList.map((serie) => {
            const videos = this.toVideosArray(serie.videos);
            return html`
              <alejost-module moduleTitle="${serie.name || ''}">
                ${videos.map(
                  (tutorial: any) => html`
                    <alejost-card
                      href="/tutorial/${serie.key}/${tutorial.slug || tutorial.key}"
                      .data="${tutorial}"
                    ></alejost-card>
                  `
                )}
              </alejost-module>
            `;
          })}
    `;
  }
}
