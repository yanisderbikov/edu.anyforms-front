import apiClient, { apiErrorMessage } from '../apiClient';

/**
 * Данные курса с бэкенда (JWT подставляет apiClient;
 * 401 разруливает его интерсептор — уводит на логин).
 */
let cache = null;

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
