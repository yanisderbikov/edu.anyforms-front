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

apiClient.instance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            console.error('Error Response:', {
                status: error.response.status,
                data: error.response.data,
                config: error.response.config,
            });

            // 401 — токен протух или вход с другого устройства погасил сессию.
            // 403 с мёртвым токеном — то же самое. Валидный токен без нужной роли
            // на логин не бросаем (иначе петля) — это разруливает гвард в AdminLayout.
            const path = window.location.pathname;
            const status = error.response.status;
            if (path !== '/login'
                && (status === 401 || (status === 403 && !apiClient.hasLiveToken()))) {
                apiClient.clearToken();
                window.location.assign('/login');
                return new Promise(() => {});
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
