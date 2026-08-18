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
