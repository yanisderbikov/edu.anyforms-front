import { getToken, dropSession } from '../auth';

/**
 * Данные курса приходят с бэкенда edu.anyforms-back
 * (dev-сервер проксирует /api на localhost:8091, см. vite.config.js).
 * Контент закрыт JWT: 401 = токен протух (например, вход с другого устройства).
 */
let cache = null;

export const fetchCourse = async () => {
  if (cache) return cache;
  const res = await fetch('/api/course', {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (res.status === 401 || res.status === 403) {
    dropSession();
    throw new Error('Сессия истекла, войдите заново');
  }
  if (!res.ok) throw new Error(`Не удалось загрузить курс: ${res.status}`);
  cache = await res.json();
  return cache;
};
