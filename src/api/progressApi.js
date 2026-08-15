import apiClient, { apiErrorMessage } from '../apiClient';

/**
 * Прогресс живёт в БД (/api/me): онбординг и просмотренные уроки
 * не теряются и видны с любого устройства. У админов онбординг всегда пройден.
 */
let cache = null;

export const fetchProgress = async () => {
  if (cache) return cache;
  try {
    const res = await apiClient.instance.get('/api/me/progress');
    cache = res.data;
    return cache;
  } catch (e) {
    throw new Error(apiErrorMessage(e, 'Не удалось загрузить прогресс'));
  }
};

export const invalidateProgress = () => {
  cache = null;
};

export const fetchCompletedLessons = async () => {
  const progress = await fetchProgress();
  return new Set(progress.completedLessonIds);
};

export const completeLesson = async (lessonId) => {
  await apiClient.instance.post(`/api/me/lessons/${lessonId}/complete`);
  if (cache) {
    cache = {
      ...cache,
      completedLessonIds: [...new Set([...cache.completedLessonIds, lessonId])],
    };
  }
  return new Set(cache?.completedLessonIds ?? [lessonId]);
};

export const finishOnboarding = async () => {
  await apiClient.instance.post('/api/me/onboarding-done');
  if (cache) {
    cache = { ...cache, onboardingDone: true };
  }
};
