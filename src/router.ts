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

    // Global click listener to intercept relative links
    document.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a') as HTMLAnchorElement | null;

      if (!anchor) return;
      const href = anchor.getAttribute('href');
      const targetAttr = anchor.getAttribute('target');

      // Ignore external, hash-only, mailto, or new-tab links
      if (
        !href ||
        targetAttr === '_blank' ||
        href.startsWith('http') ||
        href.startsWith('mailto:') ||
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
    if (window.location.pathname === path) return;

    if ('startViewTransition' in document) {
      (document as any).startViewTransition(() => {
        window.history.pushState({}, '', path);
        this.resolveCurrentRoute();
      });
    } else {
      window.history.pushState({}, '', path);
      this.resolveCurrentRoute();
    }
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
