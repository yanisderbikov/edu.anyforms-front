/**
 * Данные курса приходят JSON'ом с mock-сервера (см. vite.config.js + mock/course.json).
 * Когда появится бэкенд — достаточно поменять базовый URL / прокси.
 */
let cache = null;

export const fetchCourse = async () => {
  if (cache) return cache;
  const res = await fetch('/api/course');
  if (!res.ok) throw new Error(`Не удалось загрузить курс: ${res.status}`);
  cache = await res.json();
  return cache;
};
