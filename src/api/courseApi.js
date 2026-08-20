import apiClient, { apiErrorMessage } from '../apiClient';

/**
 * Данные курса с бэкенда (JWT подставляет apiClient;
 * 401 разруливает его интерсептор — уводит на логин).
 *
 * Кэша нет намеренно: главная берёт только превью модулей, страница модуля —
 * свой модуль с уроками. Каждый заход показывает актуальные данные, а
 * подписанные ссылки S3 не успевают протухнуть на открытой вкладке.
 */

/** Шапка курса и превью модулей — без уроков, только счётчики для карточек */
export const fetchCourse = async () => {
  try {
    const res = await apiClient.instance.get('/api/course');
    return res.data;
  } catch (e) {
    throw new Error(apiErrorMessage(e, 'Не удалось загрузить курс'));
  }
};

/** Один модуль с уроками — для страницы модуля */
export const fetchModule = async (moduleId) => {
  try {
    const res = await apiClient.instance.get(`/api/course/modules/${moduleId}`);
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
