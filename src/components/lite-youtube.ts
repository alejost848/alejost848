import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

let ytApiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (typeof (window as any).YT !== 'undefined' && (window as any).YT.Player) {
    return Promise.resolve();
  }
  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve) => {
      const existing = document.querySelector('script[src*="youtube.com/iframe_api"]');
      if (existing) {
        const prev = (window as any).onYouTubeIframeAPIReady;
        (window as any).onYouTubeIframeAPIReady = () => {
          if (prev) prev();
          resolve();
        };
        return;
      }
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

      const prev = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (prev) prev();
        resolve();
      };
    });
  }
  return ytApiPromise;
}

@customElement('lite-youtube')
export class LiteYouTube extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
      background-color: #000;
      overflow: hidden;
      cursor: pointer;
    }

    .poster-image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.3s ease, filter 0.3s ease;
    }

    :host(:hover) .poster-image {
      transform: scale(1.02);
      filter: brightness(1.05);
    }

    .play-btn {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 68px;
      height: 48px;
      background: rgba(33, 33, 33, 0.8);
      border-radius: 12px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
      z-index: 2;
    }

    :host(:hover) .play-btn {
      background-color: #f00;
      transform: translate(-50%, -50%) scale(1.1);
      box-shadow: 0 6px 20px rgba(255, 0, 0, 0.4);
    }

    .play-triangle {
      width: 0;
      height: 0;
      border-style: solid;
      border-width: 9px 0 9px 16px;
      border-color: transparent transparent transparent #fff;
      margin-left: 2px;
    }

    iframe {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border: none;
    }
  `;

  @property({ type: String }) videoId = '';
  @property({ type: String }) videoTitle = '';
  @property({ type: Number }) currentTime = 0;
  @property({ type: Number }) duration = 0;
  @property({ type: Boolean }) autoload = false;
  @state() private activated = false;

  private player: any = null;
  private progressTimer: number | null = null;
  private pendingSeek: number | null = null;

  connectedCallback() {
    super.connectedCallback();
    if (this.autoload) {
      this.activated = true;
    }
    window.addEventListener('message', this.handleWindowMessage);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('message', this.handleWindowMessage);
    this.stopProgressTracking();
    if (this.player && typeof this.player.destroy === 'function') {
      try {
        this.player.destroy();
      } catch {}
      this.player = null;
    }
  }

  protected firstUpdated() {
    if (this.activated && !this.player) {
      this.initPlayer();
    }
  }

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has('activated') && this.activated && !this.player) {
      this.initPlayer();
    }
    if (changedProps.has('videoId') && this.player && typeof this.player.loadVideoById === 'function') {
      this.player.loadVideoById(this.videoId);
    }
  }


  public activateVideo() {
    if (!this.activated) {
      this.activated = true;
    }
  }

  public seekTo(seconds: number) {
    this.pendingSeek = seconds;
    if (!this.activated) {
      this.activateVideo();
      return;
    }

    if (this.player && typeof this.player.seekTo === 'function') {
      this.player.seekTo(seconds, true);
      this.pendingSeek = null;
    } else {
      const iframe = this.renderRoot.querySelector('iframe');
      iframe?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }),
        '*'
      );
    }
  }

  public pause() {
    if (this.player && typeof this.player.pauseVideo === 'function') {
      this.player.pauseVideo();
    } else {
      const iframe = this.renderRoot.querySelector('iframe');
      iframe?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
        '*'
      );
    }
  }

  private initPlayer() {
    loadYouTubeApi().then(() => {
      const iframe = this.renderRoot.querySelector('iframe');
      if (!iframe) return;

      try {
        this.player = new (window as any).YT.Player(iframe, {
          events: {
            onReady: () => {
              if (this.pendingSeek !== null) {
                this.seekTo(this.pendingSeek);
                this.pendingSeek = null;
              }
            },
            onStateChange: (event: any) => {
              // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
              if (event.data === 1) {
                this.startProgressTracking();
              } else {
                this.stopProgressTracking();
                if (event.data === 0) {
                  const duration = this.player?.getDuration?.() || this.duration;
                  this.emitProgress(duration, duration);
                }
              }
            },
          },
        });
      } catch (err) {
        console.warn('Could not initialize YT.Player, using postMessage fallback:', err);
      }
    });
  }

  private startProgressTracking() {
    this.stopProgressTracking();
    this.progressTimer = window.setInterval(() => {
      if (this.player && typeof this.player.getCurrentTime === 'function') {
        const cur = this.player.getCurrentTime() || 0;
        const dur = this.player.getDuration() || 0;
        this.emitProgress(cur, dur);
      }
    }, 250);
  }

  private stopProgressTracking() {
    if (this.progressTimer !== null) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  private emitProgress(currentTime: number, duration: number) {
    this.currentTime = currentTime;
    this.duration = duration;
    this.dispatchEvent(
      new CustomEvent('video-progress', {
        detail: { currentTime, duration },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleWindowMessage = (event: MessageEvent) => {
    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (data && data.event === 'infoDelivery' && data.info) {
        const cur = data.info.currentTime;
        const dur = data.info.duration;
        if (typeof cur === 'number' && typeof dur === 'number' && dur > 0) {
          this.emitProgress(cur, dur);
        }
      }
    } catch {}
  };

  render() {
    if (this.activated) {
      const seekParam = this.pendingSeek ? `&start=${Math.floor(this.pendingSeek)}` : '';
      const autoPlayParam = this.autoload ? '' : '&autoplay=1';
      return html`
        <iframe
          src="https://www.youtube.com/embed/${this.videoId}?enablejsapi=1&rel=0${autoPlayParam}${seekParam}"
          title="${this.videoTitle || 'YouTube video'}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      `;
    }


    const posterUrl = `https://i.ytimg.com/vi/${this.videoId}/hqdefault.jpg`;

    return html`
      <div @click="${this.activateVideo}" aria-label="Play video">
        <img
          class="poster-image"
          src="${posterUrl}"
          alt="${this.videoTitle || 'Video thumbnail'}"
          loading="lazy"
        />
        <button class="play-btn" aria-label="Play">
          <div class="play-triangle"></div>
        </button>
      </div>
    `;
  }
}

