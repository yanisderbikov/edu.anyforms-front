import { getToken, dropSession } from '../auth';

/** Слайды онбординга с бэкенда (правятся в /admin/onboarding). */
let cache = null;

export const fetchOnboarding = async () => {
  if (cache) return cache;
  const res = await fetch('/api/onboarding', {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (res.status === 401 || res.status === 403) {
    dropSession();
    throw new Error('Сессия истекла, войдите заново');
  }
  if (!res.ok) throw new Error(`Не удалось загрузить онбординг: ${res.status}`);
  cache = await res.json();
  return cache;
};
