import apiClient, { apiErrorMessage } from '../apiClient';

/** Слайды онбординга с бэкенда (правятся в /admin/onboarding). */
let cache = null;

export const fetchOnboarding = async () => {
  if (cache) return cache;
  try {
    const res = await apiClient.instance.get('/api/onboarding');
    cache = res.data;
    return cache;
  } catch (e) {
    throw new Error(apiErrorMessage(e, 'Не удалось загрузить онбординг'));
  }
};
