export interface SeoMetadata {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'video.other';
  schema?: Record<string, any>;
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.querySelector(`meta[${attribute}="${key}"]`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

export function updateSeo(meta: SeoMetadata) {
  // 1. Page Title
  document.title = meta.title;

  // 2. Standard Meta Description
  upsertMeta('name', 'description', meta.description);

  // 3. Open Graph Tags
  const currentUrl = meta.url || window.location.href;
  upsertMeta('property', 'og:title', meta.title);
  upsertMeta('property', 'og:description', meta.description);
  upsertMeta('property', 'og:url', currentUrl);
  upsertMeta('property', 'og:type', meta.type || 'website');

  const imageUrl = meta.image || `${window.location.origin}/images/cover.png`;
  upsertMeta('property', 'og:image', imageUrl);

  // 4. Twitter / X Cards
  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', meta.title);
  upsertMeta('name', 'twitter:description', meta.description);
  upsertMeta('name', 'twitter:image', imageUrl);
  upsertMeta('name', 'twitter:creator', '@alejost848');

  // 5. Canonical Link
  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', currentUrl);

  // 6. Schema.org JSON-LD Structured Data
  let scriptEl = document.getElementById('schema-ld') as HTMLScriptElement | null;
  if (meta.schema) {
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'schema-ld';
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(meta.schema);
  } else if (scriptEl) {
    scriptEl.remove();
  }
}
