export interface RouteMatch {
  page: string;
  params: Record<string, string>;
}

export type RouteHandler = (match: RouteMatch) => void;

export class Router {
  private handler: RouteHandler;

  constructor(handler: RouteHandler) {
    this.handler = handler;

    window.addEventListener('popstate', () => {
      this.resolveCurrentRoute();
    });

    // Global click listener to intercept relative links across light and Shadow DOM
    document.addEventListener('click', (e: MouseEvent) => {
      // Ignore if default was already prevented or not primary left click
      if (e.defaultPrevented || e.button !== 0) return;

      // Ignore modified clicks (open in new window/tab)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      // Find clicked anchor element across Shadow DOM boundaries
      const path = e.composedPath();
      let anchor: HTMLAnchorElement | null = null;
      for (const el of path) {
        if (el instanceof HTMLAnchorElement) {
          anchor = el;
          break;
        }
        if (el instanceof HTMLElement && el.tagName === 'A') {
          anchor = el as HTMLAnchorElement;
          break;
        }
      }

      if (!anchor) return;
      const href = anchor.getAttribute('href');
      const targetAttr = anchor.getAttribute('target');

      // Ignore external, hash-only, mailto, tel, or new-tab links
      if (
        !href ||
        targetAttr === '_blank' ||
        href.startsWith('http:') ||
        href.startsWith('https:') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('//') ||
        href.startsWith('#')
      ) {
        return;
      }

      e.preventDefault();
      this.navigate(href);
    });
  }

  public navigate(path: string) {
    const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
    const targetPath = path.replace(/\/$/, '') || '/';
    if (currentPath === targetPath) return;

    window.history.pushState({}, '', path);
    this.resolveCurrentRoute();
  }

  public resolveCurrentRoute() {
    window.scrollTo(0, 0);
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    const match = this.matchRoute(path);
    this.handler(match);
  }

  private matchRoute(path: string): RouteMatch {
    if (path === '/' || path === '') {
      return { page: 'home', params: {} };
    }

    if (path === '/works') {
      return { page: 'works', params: { category: 'all' } };
    }

    const worksCatMatch = path.match(/^\/works\/([^/]+)$/);
    if (worksCatMatch) {
      return { page: 'works', params: { category: worksCatMatch[1] } };
    }

    const workMatch = path.match(/^\/work\/([^/]+)$/);
    if (workMatch) {
      return { page: 'work', params: { slug: workMatch[1] } };
    }

    if (path === '/tutorials') {
      return { page: 'tutorials', params: {} };
    }

    const tutorialMatch = path.match(/^\/tutorial\/([^/]+)\/([^/]+)$/);
    if (tutorialMatch) {
      return { page: 'tutorial', params: { series: tutorialMatch[1], slug: tutorialMatch[2] } };
    }

    if (path === '/about') {
      return { page: 'about', params: {} };
    }

    return { page: 'error', params: {} };
  }
}
