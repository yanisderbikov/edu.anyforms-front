import apiClient, { apiErrorMessage } from '../apiClient';

/**
 * Данные курса с бэкенда (JWT подставляет apiClient;
 * 401 разруливает его интерсептор — уводит на логин).
 *
 * Всё кэшируется в памяти: главная и каждый открытый модуль. Перезагрузка
 * страницы или новая вкладка берут данные заново — так подписанные ссылки
 * S3 не успевают протухнуть, а повторные переходы идут без запросов.
 */
let cache = null;
const moduleCache = new Map(); // moduleId → модуль с уроками

/** Сбросить кэши: при выходе, после просмотра урока и по битой картинке */
export const invalidateCourse = () => {
  cache = null;
  moduleCache.clear();
};

/** Шапка курса и превью модулей — без уроков, только счётчики для карточек */
export const fetchCourse = async () => {
  if (cache) return cache;
  try {
    const res = await apiClient.instance.get('/api/course');
    cache = res.data;
    return cache;
  } catch (e) {
    throw new Error(apiErrorMessage(e, 'Не удалось загрузить курс'));
  }
};

/** Один модуль с уроками — для страницы модуля */
export const fetchModule = async (moduleId) => {
  const cached = moduleCache.get(moduleId);
  if (cached) return cached;
  try {
    const res = await apiClient.instance.get(`/api/course/modules/${moduleId}`);
    moduleCache.set(moduleId, res.data);
    return res.data;
  } catch (e) {
    throw new Error(apiErrorMessage(e, 'Не удалось загрузить модуль'));
  }
};

/* Токен воспроизведения Kinescope (drmauthtoken плеера): Kinescope с ним
   приходит на наш бэкенд спросить, пускать ли зрителя. Кэшируем до истечения. */
let videoToken = null;
let videoTokenExpiresAt = 0;

export const fetchVideoToken = async () => {
  if (videoToken && Date.now() < videoTokenExpiresAt) return videoToken;
  const res = await apiClient.instance.get('/api/course/video-token');
  videoToken = res.data.token;
  // Обновляем за минуту до конца жизни, чтобы плеер не получил истёкший токен
  videoTokenExpiresAt = Date.now() + Math.max(0, (res.data.expiresInSeconds - 60) * 1000);
  return videoToken;
};
