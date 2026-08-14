import { getToken, dropSession } from '../auth';

/** Админское API edu.anyforms-back — все запросы с JWT роли ADMIN. */

const jsonHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

const handle = async (res) => {
  if (res.ok) {
    return res.status === 204 ? null : res.json();
  }
  // 401/403 — не залогинен или не админ: уводим на логин
  if (res.status === 401 || res.status === 403) {
    dropSession();
    throw new Error('Сессия истекла, войдите заново');
  }
  let message = `Ошибка ${res.status}`;
  try {
    const body = await res.json();
    if (body.message) message = body.message;
  } catch {
    /* тело не JSON — оставляем статус */
  }
  throw new Error(message);
};

/* ── Курс и модули ── */

export const getAdminCourse = () =>
  fetch('/api/admin/course', { headers: jsonHeaders() }).then(handle);

export const updateCourse = (data) =>
  fetch('/api/admin/course', { method: 'PUT', headers: jsonHeaders(), body: JSON.stringify(data) }).then(handle);

export const createModule = (data) =>
  fetch('/api/admin/modules', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(data) }).then(handle);

export const updateModule = (id, data) =>
  fetch(`/api/admin/modules/${id}`, { method: 'PUT', headers: jsonHeaders(), body: JSON.stringify(data) }).then(handle);

export const deleteModule = (id) =>
  fetch(`/api/admin/modules/${id}`, { method: 'DELETE', headers: jsonHeaders() }).then(handle);

/* ── Уроки ── */

export const createLesson = (moduleId, data) =>
  fetch(`/api/admin/modules/${moduleId}/lessons`, { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(data) }).then(handle);

export const updateLesson = (id, data) =>
  fetch(`/api/admin/lessons/${id}`, { method: 'PUT', headers: jsonHeaders(), body: JSON.stringify(data) }).then(handle);

export const deleteLesson = (id) =>
  fetch(`/api/admin/lessons/${id}`, { method: 'DELETE', headers: jsonHeaders() }).then(handle);

/* ── Онбординг ── */

export const getAdminOnboarding = () =>
  fetch('/api/admin/onboarding', { headers: jsonHeaders() }).then(handle);

export const createSlide = (data) =>
  fetch('/api/admin/onboarding/slides', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(data) }).then(handle);

export const updateSlide = (id, data) =>
  fetch(`/api/admin/onboarding/slides/${id}`, { method: 'PUT', headers: jsonHeaders(), body: JSON.stringify(data) }).then(handle);

export const deleteSlide = (id) =>
  fetch(`/api/admin/onboarding/slides/${id}`, { method: 'DELETE', headers: jsonHeaders() }).then(handle);

/* ── Загрузка файлов ── */

/** Просим бэкенд подписать URL — сам файл через бэкенд не проходит */
export const presignUpload = (filename, contentType, prefix) =>
  fetch('/api/admin/presign-upload', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ filename, contentType, prefix }),
  }).then(handle);

/** Прямая загрузка в S3 по подписанному URL, с прогрессом */
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
