// Единый источник SEO-метаданных страниц: используется и клиентом
// (src/shared/seo.js меняет теги при переходах), и сборкой — vite-плагин
// впечатывает мета главной прямо в index.html (см. vite.config.js), чтобы
// поисковики и мессенджеры видели их без выполнения JS.
// Схема — как в anyforms-front (src/shared/pageSeo.mjs), только без пререндера:
// здесь всё под авторизацией, рендерить в HTML нечего.
export const SITE_URL = 'https://edu.anyforms.ru';

export const SITE_NAME = 'Обучение anyforms';

// Логотип anyforms — тот же файл, что в og:image на anyforms-front: растровый
// (SVG мессенджеры в og:image не понимают) и на внешнем сторадже, поэтому
// превью работает одинаково с прода, дев-стенда и до того, как поднят домен.
export const DEFAULT_OG_IMAGE =
  'https://storage.yandexcloud.net/anyforms/utils/logos/logo-black.jpg';

// Главная = «визитка» платформы: и в выдаче, и в превью ссылки должно быть
// видно, что это обучение anyforms и что здесь курс по силиконовым формам.
export const HOME_SEO = {
  title: 'Обучение anyforms — курс по производству силиконовых форм',
  description:
    'Платформа обучения anyforms: видео-курс по производству силиконовых форм — 4 модуля от дизайна и 3D-печати мастер-модели до литья и финишной обработки.',
  indexable: true,
};

export const PAGE_SEO = {
  '/': HOME_SEO,
  // Анонимный посетитель с / уезжает на /login, поэтому у страницы входа то же
  // описание, а canonical склеивает её с главной — в индексе остаётся один URL.
  '/login': { ...HOME_SEO, canonical: '/' },
  '/onboarding': {
    title: 'Знакомство с платформой — обучение anyforms',
    description: 'Первые шаги на платформе обучения anyforms перед началом курса.',
  },
  '/module': {
    title: 'Модуль курса — обучение anyforms',
    description: 'Уроки модуля курса по производству силиконовых форм.',
  },
  '/admin': {
    title: 'Админка — обучение anyforms',
    description: 'Управление курсом, онбордингом и доступами платформы обучения anyforms.',
  },
};

// Микроразметка главной: поисковику говорим прямым текстом, что по этому адресу
// живёт онлайн-курс и кто его проводит.
export const HOME_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Course',
  name: 'Курс по производству силиконовых форм',
  description:
    'Видео-курс из 4 модулей: полный цикл производства силиконовых форм — от дизайна и 3D-печати мастер-модели до литья и финишной обработки.',
  url: `${SITE_URL}/`,
  image: DEFAULT_OG_IMAGE,
  inLanguage: 'ru',
  provider: {
    '@type': 'Organization',
    name: 'anyforms',
    url: 'https://anyforms.ru',
  },
  hasCourseInstance: {
    '@type': 'CourseInstance',
    courseMode: 'online',
  },
};
