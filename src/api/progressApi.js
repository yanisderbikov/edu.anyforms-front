import apiClient, { apiErrorMessage } from '../apiClient';
import { invalidateCourse } from './courseApi';

/**
 * Прогресс живёт в БД (/api/me): онбординг и просмотренные уроки
 * не теряются и видны с любого устройства. У админов онбординг всегда пройден.
 *
 * POST'ы возвращают актуальный прогресс — кладём ответ в кеш, поэтому
 * повторный GET не нужен и гонки «сохранили, но ещё не видно» не возникает.
 */
let cache = null;

/** Аварийная отметка на случай, если сервер не смог сохранить: чтобы
 *  не запереть человека в бесконечном онбординге. Ключ — на пользователя. */
const fallbackKey = () => {
  const email = apiClient.getJwtMetadata()?.email || 'unknown';
  return `edu_onboarding_fallback_${email}`;
};

export const markOnboardingFallback = () => {
  try {
    localStorage.setItem(fallbackKey(), '1');
  } catch {
    /* приватный режим — переживём */
  }
};

const hasOnboardingFallback = () => {
  try {
    return localStorage.getItem(fallbackKey()) === '1';
  } catch {
    return false;
  }
};

const clearOnboardingFallback = () => {
  try {
    localStorage.removeItem(fallbackKey());
  } catch {
    /* ничего не делаем */
  }
};

const applyFallback = (progress) =>
  progress.onboardingDone || !hasOnboardingFallback()
    ? progress
    : { ...progress, onboardingDone: true };

export const fetchProgress = async () => {
  if (cache) return cache;
  try {
    const res = await apiClient.instance.get('/api/me/progress');
    // Сервер подтвердил онбординг — аварийная отметка больше не нужна
    if (res.data.onboardingDone) clearOnboardingFallback();
    cache = applyFallback(res.data);
    return cache;
  } catch (e) {
    throw new Error(apiErrorMessage(e, 'Не удалось загрузить прогресс'));
  }
};

/** Синхронный снимок прогресса (или null, если ещё не загружали).
 *  Нужен роутеру: решение «пускать или в онбординг» принимается прямо в рендере,
 *  ждать промис там нельзя, а собственный state гварда отстаёт на рендер. */
export const getCachedProgress = () => (cache ? applyFallback(cache) : null);

export const invalidateProgress = () => {
  cache = null;
};

export const fetchCompletedLessons = async () => {
  const progress = await fetchProgress();
  return new Set(progress.completedLessonIds);
};

export const completeLesson = async (lessonId) => {
  const res = await apiClient.instance.post(`/api/me/lessons/${lessonId}/complete`);
  // На главной поменялись кольца прогресса — её кэш больше не актуален
  invalidateCourse();
  cache = applyFallback(res.data);
  return new Set(cache.completedLessonIds);
};

export const finishOnboarding = async () => {
  const res = await apiClient.instance.post('/api/me/onboarding-done');
  if (res.data?.onboardingDone) {
    cache = res.data;
    clearOnboardingFallback();
    return cache;
  }
  // Ответ без подтверждения (пустое тело, прокси) — не затираем прогресс нулём
  // и страхуемся локальной отметкой, иначе роутер вернёт человека в онбординг
  markOnboardingFallback();
  cache = { completedLessonIds: [], ...cache, onboardingDone: true };
  return cache;
};
