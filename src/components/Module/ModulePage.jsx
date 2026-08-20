import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import KinescopePlayer from '@kinescope/react-kinescope-player';
import apiClient from '../../apiClient';
import Header from '../shared/Header/Header';
import SupportHint from '../shared/SupportHint';
import { fetchCourse, fetchVideoToken } from '../../api/courseApi';
import { fetchCompletedLessons, completeLesson } from '../../api/progressApi';
import { formatFileSize } from '../../shared/format';
import { parseKinescope } from '../../shared/kinescope';
import styles from './ModulePage.module.css';

/* Стрелка «скачать» у материала урока */
const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M8 2.5v7m0 0 3-3m-3 3-3-3M3 13.5h10"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* Кусочки конфетти для ачивки: детерминированные, чтобы не дёргались при ререндере */
const CONFETTI = Array.from({ length: 24 }, (_, i) => ({
  left: (i * 41) % 100,
  delay: ((i * 137) % 60) / 100,
  duration: 1.6 + ((i * 53) % 80) / 100,
  color: ['#6c86bd', '#8fa8dc', '#ffffff', '#f0c75e'][i % 4],
  size: 7 + (i % 3) * 3,
}));

const ModulePage = () => {
  const { moduleId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(new Set());
  const [scroll, setScroll] = useState(0);
  const [achievement, setAchievement] = useState(false);
  const [videoToken, setVideoToken] = useState(null);
  const [videoTokenReady, setVideoTokenReady] = useState(false);
  const [ratios, setRatios] = useState({}); // lessonId → реальные пропорции из плеера

  useEffect(() => {
    fetchCourse().then(setData).catch((e) => setError(e.message));
    fetchCompletedLessons().then(setCompleted);
  }, []);

  /* Токен воспроизведения Kinescope: плеер отдаёт его Kinescope, а тот приходит
     на наш бэкенд спросить, пускать ли этого зрителя (DRM-авторизация).
     Плееры монтируем только после ответа, чтобы не пересоздавать их с токеном */
  useEffect(() => {
    if (!data) return;
    const hasKinescope = data.modules.some((m) =>
      m.lessons?.some((l) => parseKinescope(l.videoUrl))
    );
    if (!hasKinescope) {
      setVideoTokenReady(true);
      return;
    }
    fetchVideoToken()
      .then(setVideoToken)
      // Не получили — плеер пробует без токена (играет, пока авторизация не строгая)
      .catch(() => {})
      .finally(() => setVideoTokenReady(true));
  }, [data]);

  // Скролл-прогресс страницы для полоски в шапке
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScroll(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 100);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [data]);

  const module = data?.modules.find((m) => m.id === moduleId);

  /* Динамическая вотермарка Kinescope: поверх видео всплывает email студента,
     чтобы запись экрана можно было отследить до конкретного аккаунта.
     Позицию Kinescope задавать не даёт, поэтому делаем её незаметной иначе:
     мелкий текст и редкие короткие показы вместо постоянного мельтешения.
     Защита сохраняется — в любые полминуты записи email попадает. */
  const watermark = useMemo(() => {
    const email = apiClient.getJwtMetadata()?.email;
    return email
      ? {
          text: email,
          // Доля от размера плеера; у Kinescope по умолчанию 0.25
          scale: 0.1,
          // Виден 4 секунды, потом 26 секунд не показывается
          displayTimeout: { visible: 4000, hidden: 26000 },
        }
      : undefined;
  }, []);

  const doneCount = useMemo(
    () => (module ? module.lessons.filter((l) => completed.has(l.id)).length : 0),
    [module, completed]
  );

  /* Видео досмотрено до конца → отмечаем урок пройденным.
     С бэкендом здесь будет POST, а «просмотрен полностью» решит сервер. */
  const handleEnded = async (lesson) => {
    if (completed.has(lesson.id)) return;
    const next = await completeLesson(lesson.id);
    setCompleted(new Set(next));
    const allDone = module.lessons.every((l) => next.has(l.id));
    if (allDone) setAchievement(true);
  };

  return (
    <div className={styles.page}>
      <Header
        progress={
          module && module.status === 'open'
            ? { scroll, done: doneCount, total: module.lessons.length }
            : null
        }
      />

      <main className={styles.main}>
        <Link to="/" className={styles.backLink}>
          ← Все модули
        </Link>

        {error && (
          <p className={styles.error}>
            <SupportHint>{error}</SupportHint>
          </p>
        )}
        {!data && !error && <p className={styles.loading}>Загружаем модуль…</p>}

        {data && !module && <p className={styles.error}>Модуль не найден.</p>}

        {module && module.status !== 'open' && (
          <p className={styles.error}>Этот модуль ещё не открыт.</p>
        )}

        {module && module.status === 'open' && (
          <>
            <div className={styles.head}>
              <span className="eyebrow eyebrowAccent">Модуль {module.order}</span>
              <h1 className="h2">
                <span className="hAccent">{module.title}</span>
              </h1>
              <p className="lead multiline">{module.description}</p>
            </div>

            <div className={styles.lessons}>
              {module.lessons.map((lesson, i) => {
                const done = completed.has(lesson.id);
                const kinescope = parseKinescope(lesson.videoUrl);
                return (
                  <section key={lesson.id} className={styles.lesson}>
                    <div className={styles.lessonHead}>
                      <span
                        className={`${styles.lessonNum} ${done ? styles.lessonNumDone : ''}`}
                      >
                        {done ? '✓' : i + 1}
                      </span>
                      <h2 className="h3">{lesson.title}</h2>
                    </div>
                    {kinescope ? (
                      (() => {
                        // Пропорции: пока видео не загрузилось — из ссылки (#ratio)
                        // или 16:9, дальше плеер сообщает реальные через SizeChanged
                        const aspect = ratios[lesson.id] ?? kinescope.aspectRatio;
                        return (
                          <div
                            className={styles.kinescope}
                            style={{
                              '--video-ar': aspect,
                              '--video-maxh': aspect < 1 ? '62vh' : '46vh',
                            }}
                          >
                            {videoTokenReady && (
                              <KinescopePlayer
                                videoId={kinescope.videoId}
                                poster={lesson.cover || undefined}
                                watermark={watermark}
                                drmAuthToken={videoToken || undefined}
                                onSizeChanged={({ width, height }) => {
                                  if (!(width > 0 && height > 0)) return;
                                  const ar = width / height;
                                  setRatios((r) =>
                                    Math.abs((r[lesson.id] ?? 0) - ar) < 0.01
                                      ? r
                                      : { ...r, [lesson.id]: ar }
                                  );
                                }}
                                onEnded={() => handleEnded(lesson)}
                              />
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <video
                        className={styles.video}
                        src={lesson.videoUrl}
                        poster={lesson.cover}
                        controls
                        preload="metadata"
                        playsInline
                        onEnded={() => handleEnded(lesson)}
                      />
                    )}
                    <p className={styles.lessonDesc}>{lesson.description}</p>

                    {/* Скачиваемые материалы: ссылка подписана бэкендом,
                        браузер сохранит файл под исходным именем */}
                    {lesson.files?.length > 0 && (
                      <div className={styles.files}>
                        <span className={styles.filesTitle}>Материалы урока</span>
                        {lesson.files.map((f) => (
                          <a
                            key={f.id}
                            className={styles.fileLink}
                            href={f.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <span className={styles.fileIcon}>
                              <DownloadIcon />
                            </span>
                            <span className={styles.fileName}>{f.name}</span>
                            {f.sizeBytes != null && (
                              <span className={styles.fileSize}>{formatFileSize(f.sizeBytes)}</span>
                            )}
                          </a>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Ачивка: модуль пройден целиком */}
      {achievement && (
        <div className={styles.achievement} role="dialog" aria-label="Модуль пройден">
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              className={styles.confetti}
              style={{
                left: `${c.left}%`,
                width: c.size,
                height: c.size,
                background: c.color,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.duration}s`,
              }}
            />
          ))}
          <div className={styles.achievementCard}>
            <span className={styles.achievementBadge}>🏆</span>
            <span className="eyebrow eyebrowAccent">Ачивка</span>
            <h2 className={`h2 ${styles.achievementTitle}`}>
              Модуль <span className="hAccent">пройден!</span>
            </h2>
            <p className="lead">
              «{module.title}» позади. Так держать — следующий модуль уже не за горами.
            </p>
            <div className={styles.achievementActions}>
              <Link to="/" className="btn">
                К модулям
              </Link>
              <button
                type="button"
                className="btn btnGhost"
                onClick={() => setAchievement(false)}
              >
                Остаться здесь
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModulePage;
