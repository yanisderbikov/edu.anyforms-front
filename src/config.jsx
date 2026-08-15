const config = {
    // Пусто = same-origin: в dev запросы уходят через прокси vite на :8091
    apiUrl: import.meta.env.VITE_API_URL || '',
    // Чат поддержки — показывается при любой ошибке сервиса
    supportHandle: '@AnyFormsBot',
    supportUrl: 'https://t.me/AnyFormsBot',
};

export default config;
