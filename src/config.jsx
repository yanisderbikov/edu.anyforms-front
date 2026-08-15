/**
 * Адрес бэка, по убыванию приоритета:
 * 1. Runtime: window.__ENV__.API_URL — генерируется из env при старте контейнера
 *    (scripts/inject-env.mjs). Одна сборка работает на любом стенде.
 * 2. Build-time: VITE_API_URL — локальный dev (.env.development) и ручные сборки.
 * 3. Фолбэк — прод-бэк, чтобы сборка без настроек не смотрела в никуда.
 */
const runtimeEnv = (typeof window !== 'undefined' && window.__ENV__) || {};

const config = {
    apiUrl:
        runtimeEnv.API_URL ||
        import.meta.env.VITE_API_URL ||
        'https://edu-anyforms-back.up.railway.app',
    // Чат поддержки — показывается при любой ошибке сервиса
    supportHandle: '@AnyFormsBot',
    supportUrl: 'https://t.me/AnyFormsBot',
};

export default config;
