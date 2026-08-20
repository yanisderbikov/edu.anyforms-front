import apiClient, { apiErrorMessage } from '../apiClient';

/** Админское API — JWT подставляет apiClient, 401/403 разруливает его интерсептор. */

const call = async (promise) => {
  try {
    const res = await promise;
    return res.data;
  } catch (e) {
    throw new Error(apiErrorMessage(e));
  }
};

/* ── Курс и модули ── */

export const getAdminCourse = () => call(apiClient.instance.get('/api/admin/course'));

export const updateCourse = (data) => call(apiClient.instance.put('/api/admin/course', data));

export const createModule = (data) => call(apiClient.instance.post('/api/admin/modules', data));

export const updateModule = (id, data) => call(apiClient.instance.put(`/api/admin/modules/${id}`, data));

export const deleteModule = (id) => call(apiClient.instance.delete(`/api/admin/modules/${id}`));

/* ── Уроки ── */

export const createLesson = (moduleId, data) =>
  call(apiClient.instance.post(`/api/admin/modules/${moduleId}/lessons`, data));

export const updateLesson = (id, data) => call(apiClient.instance.put(`/api/admin/lessons/${id}`, data));

export const deleteLesson = (id) => call(apiClient.instance.delete(`/api/admin/lessons/${id}`));

/* ── Файлы урока ── */

/** Файл уже в S3 (см. presignUpload) — прикрепляем к уроку имя, ключ и размер */
export const createLessonFile = (lessonId, data) =>
  call(apiClient.instance.post(`/api/admin/lessons/${lessonId}/files`, data));

export const deleteLessonFile = (fileId) => call(apiClient.instance.delete(`/api/admin/files/${fileId}`));

/* ── Онбординг ── */

export const getAdminOnboarding = () => call(apiClient.instance.get('/api/admin/onboarding'));

export const createSlide = (data) => call(apiClient.instance.post('/api/admin/onboarding/slides', data));

export const updateSlide = (id, data) =>
  call(apiClient.instance.put(`/api/admin/onboarding/slides/${id}`, data));

export const deleteSlide = (id) => call(apiClient.instance.delete(`/api/admin/onboarding/slides/${id}`));

/* ── Загрузка файлов ── */

/** Просим бэкенд подписать URL — сам файл через бэкенд не проходит */
export const presignUpload = (filename, contentType, prefix) =>
  call(apiClient.instance.post('/api/admin/presign-upload', { filename, contentType, prefix }));

/* ── Kinescope: видео уроков ── */

/** Бэкенд создаёт upload-ссылку Kinescope — их API-токен живёт только у него */
export const createKinescopeUploadLink = (filename, filesize) =>
  call(apiClient.instance.post('/api/admin/kinescope/upload-link', { filename, filesize }));

/**
 * Прямая загрузка видео в Kinescope по upload-ссылке, с прогрессом.
 * Нарочно мимо apiClient: наш Bearer-заголовок Kinescope не нужен.
 * Возвращает распарсенный ответ Kinescope (или null) — в нём id видео.
 */
export const uploadToKinescope = (endpoint, file, onProgress) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Kinescope ответил ${xhr.status}`));
        return;
      }
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch {
        resolve(null);
      }
    };
    xhr.onerror = () => reject(new Error('Не удалось загрузить видео в Kinescope'));
    xhr.send(file);
  });

/**
 * Прямая загрузка в S3 по подписанному URL, с прогрессом.
 * Нарочно мимо apiClient: Bearer-заголовок в запросе к S3 не нужен.
 */
export const uploadToS3 = (uploadUrl, file, onProgress) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    // Content-Type входит в подпись — заголовок должен совпадать с presign-запросом
    if (file.type) xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`S3 ответил ${xhr.status}`));
    xhr.onerror = () => reject(new Error('Не удалось загрузить в S3 (проверьте CORS на бакете)'));
    xhr.send(file);
  });
