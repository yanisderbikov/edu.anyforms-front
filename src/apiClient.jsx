import { Api } from './shared/api/api.gen.ts';
import config from './config';
import { jwtDecode } from 'jwt-decode';

// Храним JWT в localStorage (без куки) — схема как в anyforms-front
export const jwt_key = 'edu_jwt_authentication';

const getStoredToken = () => {
    try {
        return localStorage.getItem(jwt_key);
    } catch {
        return null;
    }
};

const setStoredToken = (token) => {
    try {
        if (token) {
            localStorage.setItem(jwt_key, token);
        } else {
            localStorage.removeItem(jwt_key);
        }
    } catch (e) {
        console.warn('localStorage unavailable', e);
    }
};

// Функция, которая будет добавлять токен в каждый запрос
const securityWorker = () => {
    const token = getStoredToken();
    if (token) {
        return {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        };
    }
    return {};
};

// Инициализируем API-клиент с базовым URL и securityWorker (без withCredentials)
const apiClient = new Api({
    baseURL: config.apiUrl,
    securityWorker,
});

// Генерированный клиент подставляет security только в помеченные secure-запросы;
// у нас токен нужен везде, поэтому добавляем его на уровне axios
apiClient.instance.interceptors.request.use(
    (requestConfig) => {
        const token = getStoredToken();
        if (token && !requestConfig.headers?.Authorization) {
            requestConfig.headers.Authorization = `Bearer ${token}`;
        }
        return requestConfig;
    },
    (error) => Promise.reject(error)
);

// Добавляем метод для установки JWT токена
apiClient.setToken = (token) => {
    setStoredToken(token);
    apiClient.setSecurityData(token);
};

// Добавляем метод для получения JWT токена
apiClient.getToken = () => getStoredToken();

// Очистка токена (логаут)
apiClient.clearToken = () => {
    setStoredToken(null);
    apiClient.setSecurityData(null);
};

// Есть ли живой токен: существует, парсится и не истёк.
apiClient.hasLiveToken = () => {
    const token = getStoredToken();
    if (!token) return false;
    try {
        const { exp } = jwtDecode(token);
        return !exp || exp * 1000 > Date.now();
    } catch {
        return false;
    }
};

apiClient.getJwtMetadata = () => {
    const token = getStoredToken();
    if (!token) return null;

    try {
        const decoded = jwtDecode(token);

        return {
            email: decoded.sub || null,
            role: decoded.role || null,
            raw: decoded,
        };
    } catch (e) {
        console.error('Failed to decode JWT:', e);
        return null;
    }
};

const HOME_PATH = '/';
const LOGIN_PATH = '/login';

// Отметка «уже уводили на главную из-за 403». Редирект перезагружает страницу,
// поэтому память не годится — храним в sessionStorage. Отметка живёт секунды:
// её задача — поймать повторный 403 сразу после ухода (в том числе когда роутер
// увёл с главной дальше), а не запомнить сбой на всю сессию.
const bounceKey = 'edu_403_bounce_at';
const bounceWindowMs = 5000;

const markBounce = () => {
    try {
        sessionStorage.setItem(bounceKey, String(Date.now()));
    } catch {
        /* приватный режим — переживём, защитит проверка пути */
    }
};

const bouncedJustNow = () => {
    try {
        const at = Number(sessionStorage.getItem(bounceKey));
        return at > 0 && Date.now() - at < bounceWindowMs;
    } catch {
        return false;
    }
};

// Уводим жёстко, а промис оставляем висеть: локальные catch'и не должны
// мигать ошибкой на странице, которая всё равно сейчас сменится.
const leaveTo = (path) => {
    window.location.assign(path);
    return new Promise(() => {});
};

apiClient.instance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            console.error('Error Response:', {
                status: error.response.status,
                data: error.response.data,
                config: error.response.config,
            });

            const path = window.location.pathname;
            const status = error.response.status;

            if (path !== LOGIN_PATH) {
                // 401 — токен протух или вход с другого устройства погасил сессию.
                if (status === 401) {
                    apiClient.clearToken();
                    return leaveTo(LOGIN_PATH);
                }

                if (status === 403) {
                    // Прав не хватает — уводим на главную. Но если 403 прилетел
                    // уже с главной (или сразу после такого ухода), либо токен
                    // мёртвый — главная не поможет, нужен вход заново.
                    // Токен при этом гасим: с живым токеном /login сразу вернёт
                    // на главную и получится петля.
                    if (path === HOME_PATH || bouncedJustNow() || !apiClient.hasLiveToken()) {
                        apiClient.clearToken();
                        return leaveTo(LOGIN_PATH);
                    }
                    markBounce();
                    return leaveTo(HOME_PATH);
                }
            }
        }

        // Прокидываем ошибку дальше для локальной обработки
        return Promise.reject(error);
    }
);

/** Достаёт человекочитаемое сообщение из ответа бэка ({"message": "…"}) */
export const apiErrorMessage = (error, fallback = 'Что-то пошло не так') => {
    return error?.response?.data?.message || error?.message || fallback;
};

export default apiClient;
