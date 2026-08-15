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
