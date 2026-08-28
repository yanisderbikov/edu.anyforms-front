import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  HOME_SEO,
  HOME_JSONLD,
} from './src/shared/pageSeo.js';

const SEO_PLACEHOLDER = '<!--seo-->';

const escapeHtml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Мета главной прямо в HTML: краулеры и превью ссылок в мессенджерах читают
// разметку до выполнения JS, а приложение целиком под авторизацией — рендерить
// в HTML нечего. Значения берутся из src/shared/pageSeo.js, чтобы не разъезжались
// с тем, что ставит клиент при переходах (src/shared/seo.js).
const injectHomeSeo = () => ({
  name: 'inject-home-seo',
  transformIndexHtml(html) {
    if (!html.includes(SEO_PLACEHOLDER)) {
      throw new Error(`index.html: не найден ${SEO_PLACEHOLDER} — SEO-мета вставлять некуда`);
    }

    const title = escapeHtml(HOME_SEO.title);
    const description = escapeHtml(HOME_SEO.description);
    const image = HOME_SEO.image ?? DEFAULT_OG_IMAGE;
    const url = `${SITE_URL}/`;
    // "<" внутри JSON-LD экранируем, чтобы содержимое не могло закрыть <script>
    const jsonLd = JSON.stringify(HOME_JSONLD).replace(/</g, '\\u003c');

    const tags = [
      `<title>${title}</title>`,
      `<meta name="description" content="${description}" />`,
      '<meta name="robots" content="index,follow,max-image-preview:large" />',
      `<link rel="canonical" href="${url}" />`,
      `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
      '<meta property="og:locale" content="ru_RU" />',
      '<meta property="og:type" content="website" />',
      `<meta property="og:title" content="${title}" />`,
      `<meta property="og:description" content="${description}" />`,
      `<meta property="og:url" content="${url}" />`,
      `<meta property="og:image" content="${image}" />`,
      // Размеры логотипа: мессенджеры рисуют превью, не дожидаясь загрузки картинки
      '<meta property="og:image:width" content="839" />',
      '<meta property="og:image:height" content="839" />',
      '<meta name="twitter:card" content="summary_large_image" />',
      `<meta name="twitter:title" content="${title}" />`,
      `<meta name="twitter:description" content="${description}" />`,
      `<meta name="twitter:image" content="${image}" />`,
      `<script type="application/ld+json">${jsonLd}</script>`,
    ].join('\n    ');

    return html.replace(SEO_PLACEHOLDER, tags);
  },
});

export default defineConfig({
  plugins: [react(), injectHomeSeo()],
});
