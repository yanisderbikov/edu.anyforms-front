import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SITE_URL, DEFAULT_OG_IMAGE, PAGE_SEO } from './pageSeo';

/* Мета-теги страниц на клиенте. В index.html лежат мета главной (их впечатывает
   vite-плагин), а при переходах внутри SPA теги переписывает этот хук —
   значения берутся из того же src/shared/pageSeo.js. */

const upsertMetaTag = (selector, attributes) => {
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement('meta');
    document.head.appendChild(tag);
  }
  Object.entries(attributes).forEach(([key, value]) => tag.setAttribute(key, value));
};

const upsertCanonical = (href) => {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
};

/** '/module/3' → мета ключа '/module': берём самый длинный подходящий префикс */
const findSeo = (path) => {
  if (PAGE_SEO[path]) return PAGE_SEO[path];
  const key = Object.keys(PAGE_SEO)
    .filter((k) => k !== '/' && path.startsWith(`${k}/`))
    .sort((a, b) => b.length - a.length)[0];
  // Неизвестный путь: App редиректит его на главную, значит и мета — главной
  return key ? PAGE_SEO[key] : PAGE_SEO['/'];
};

export const useSeo = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/';
    const seo = findSeo(path);
    const pageUrl = `${SITE_URL}${seo.canonical ?? path}`;
    const ogImage = seo.image ?? DEFAULT_OG_IMAGE;

    document.title = seo.title;
    upsertMetaTag('meta[name="description"]', { name: 'description', content: seo.description });
    // Внутренние страницы (уроки, онбординг, админка) в индекс не пускаем
    upsertMetaTag('meta[name="robots"]', {
      name: 'robots',
      content: seo.indexable ? 'index,follow,max-image-preview:large' : 'noindex,nofollow',
    });
    upsertMetaTag('meta[property="og:title"]', { property: 'og:title', content: seo.title });
    upsertMetaTag('meta[property="og:description"]', {
      property: 'og:description',
      content: seo.description,
    });
    upsertMetaTag('meta[property="og:url"]', { property: 'og:url', content: pageUrl });
    upsertMetaTag('meta[property="og:image"]', { property: 'og:image', content: ogImage });
    upsertMetaTag('meta[name="twitter:title"]', { name: 'twitter:title', content: seo.title });
    upsertMetaTag('meta[name="twitter:description"]', {
      name: 'twitter:description',
      content: seo.description,
    });
    upsertMetaTag('meta[name="twitter:image"]', { name: 'twitter:image', content: ogImage });
    upsertCanonical(pageUrl);
  }, [pathname]);
};
