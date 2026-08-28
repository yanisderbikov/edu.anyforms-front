/**
 * Авторизация через бэкенд: код на почту → JWT (живёт месяц).
 * Токен хранит apiClient (схема anyforms-front), email и роль читаются из JWT.
 * У клиентов вход с нового устройства гасит старые токены (решает бэкенд).
 */
import apiClient, { apiErrorMessage } from './apiClient';
import { invalidateProgress } from './api/progressApi';
import { invalidateCourse } from './api/courseApi';

export const requestCode = async (email) => {
  try {
    const res = await apiClient.instance.post('/api/auth/request-code', { email });
    return { ...res.data, alreadySent: false };
  } catch (e) {
    // 429 — живой код уже отправлен (кулдаун повторной отправки).
    // Это не отказ во входе: письмо у пользователя есть, пускаем вводить код.
    if (e?.response?.status === 429) {
      return { alreadySent: true, message: apiErrorMessage(e) };
    }
    throw new Error(apiErrorMessage(e));
  }
};

export const verifyCode = async (email, code) => {
  try {
    const res = await apiClient.instance.post('/api/auth/verify', { email, code });
    apiClient.setToken(res.data.token);
    return res.data;
  } catch (e) {
    throw new Error(apiErrorMessage(e));
  }
};

export const getAuth = () => apiClient.getJwtMetadata();

export const getToken = () => apiClient.getToken();

export const isAdmin = () => apiClient.getJwtMetadata()?.role === 'ADMIN';

export const isLoggedIn = () => apiClient.hasLiveToken();

export const logout = () => {
  apiClient.clearToken();
  // Прогресс и курс хранятся в БД — локально сбрасываем только кеши
  invalidateProgress();
  invalidateCourse();
};

/** Токен протух/отозван — чистим сессию и уводим на логин */
export const dropSession = () => {
  logout();
  window.location.assign('/login');
};
