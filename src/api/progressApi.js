/**
 * Прогресс прохождения: какие уроки просмотрены полностью.
 *
 * Сейчас — заглушка на localStorage, но интерфейс уже «как у бэкенда»:
 *   GET  /api/progress            → { completedLessonIds: [...] }
 *   POST /api/progress/complete   → { lessonId }
 * Когда появится бэкенд (он будет получать событие ended от плеера
 * и сам решать, что урок «просмотрен полностью») — меняем только этот файл.
 */
const KEY = 'edu_af_progress';

const read = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY)) || []);
  } catch {
    return new Set();
  }
};

export const fetchCompletedLessons = async () => read();

export const completeLesson = async (lessonId) => {
  const set = read();
  set.add(lessonId);
  localStorage.setItem(KEY, JSON.stringify([...set]));
  return set;
};
