# edu.anyforms-front

Учебная платформа anyforms: логин по коду с почты → онбординг → модули курса с видео.
Дизайн — со страницы `/course` проекта anyforms-front, схема работы с API — как там же.

## Запуск

```bash
npm install
npm run dev        # ходит на локальный бэк :8091 (см. .env.development)
```

Открыть http://localhost:5173. Бэкенд — edu.anyforms-back (порт 8091).

## Как фронт находит бэк

Адрес бэка настраивается переменной окружения **в рантайме** — одна и та же сборка
работает локально, на деве и на проде без пересборки.

Механика: `index.html` первым делом грузит `/env.js`; при старте контейнера
(`npm run start`) скрипт [scripts/inject-env.mjs](scripts/inject-env.mjs)
перегенерирует `dist/env.js` из переменной `API_URL`. Приоритет в
[src/config.jsx](src/config.jsx):

1. `API_URL` из окружения стенда (runtime, через env.js)
2. `VITE_API_URL` на этапе сборки (локальный dev: `.env.development` → `:8091`)
3. Фолбэк — прод-бэк, чтобы сборка без настроек не смотрела в никуда

| Окружение | Что настроить |
|---|---|
| Локально (`npm run dev`) | Ничего: `.env.development` уже указывает на `:8091` |
| Дев-стенд (Railway) | Переменная `API_URL=https://edu-anyforms-back.up.railway.app`, старт-команда `npm run start` |
| Прод | Та же переменная со своим адресом — пересборка не нужна |

## Что внутри

- **`src/apiClient.jsx`** — axios-клиент по образцу anyforms-front: JWT в localStorage,
  Bearer в каждом запросе, 401/протухшая сессия → редирект на логин.
- **`src/shared/api/api.gen.ts`** — типизированный клиент из Swagger:
  `npm run dev-api` (с локального бэка) / `npm run api` (с прода).
- **Базовый дизайн** — [src/styles/base.css](src/styles/base.css): все цвета, шрифты,
  размеры заголовков и скругления. Меняем токены там — дизайн меняется во всём проекте.
- **Прогресс клиента** (онбординг, просмотренные уроки) хранится в БД бэкенда (`/api/me`).
- **SEO** — [src/shared/pageSeo.js](src/shared/pageSeo.js): один источник правды для
  title/description/OG (см. ниже).

## SEO

Домен — `https://edu.anyforms.ru` (константа `SITE_URL` в
[src/shared/pageSeo.js](src/shared/pageSeo.js), там же тексты страниц).

Схема как в anyforms-front, но без SSR: приложение целиком под авторизацией,
пререндерить нечего.

| Что | Где |
|---|---|
| Тексты мета всех страниц + микроразметка `Course` | [src/shared/pageSeo.js](src/shared/pageSeo.js) |
| Мета главной прямо в HTML (краулеры и превью в мессенджерах читают без JS) | vite-плагин `inject-home-seo` в [vite.config.js](vite.config.js) → плейсхолдер `<!--seo-->` в [index.html](index.html) |
| Мета при переходах внутри SPA | хук `useSeo()` в [src/shared/seo.js](src/shared/seo.js), вызывается в `App` |
| Картинка превью (`og:image`) | логотип anyforms на внешнем сторадже — тот же файл, что в anyforms-front (`DEFAULT_OG_IMAGE`) |
| Иконки (таб браузера, экран телефона) | `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` в [public](public) — те же файлы, что на anyforms-front |
| Индексация | [public/robots.txt](public/robots.txt), [public/sitemap.xml](public/sitemap.xml) |

В индекс пускаем только `/` и `/login` (анонимный заход на `/` уезжает на
логин редиректом, поэтому у страницы входа то же описание и `canonical` на `/`).
Онбординг, уроки и админка — `noindex,nofollow` плюс `Disallow` в robots.txt.
Чтобы убрать платформу из поиска целиком: `indexable: false` у `HOME_SEO`
и `Disallow: /` в robots.txt.

Текст мета правим **только** в `pageSeo.js` — и HTML, и клиент берут его оттуда.
Если убрать `<!--seo-->` из `index.html`, сборка упадёт с понятной ошибкой.

## Роуты

- `/login` — вход по e-mail + код с почты
- `/onboarding` — слайды знакомства (правятся в админке, показываются один раз)
- `/` — главный экран: модули с прогрессом, ЛК, поддержка
- `/module/:id` — уроки модуля: заголовок, видео, описание
- `/admin/course`, `/admin/course/:id`, `/admin/onboarding` — админка (роль ADMIN)
