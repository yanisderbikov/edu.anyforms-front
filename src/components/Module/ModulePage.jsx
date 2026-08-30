import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import KinescopePlayer from '@kinescope/react-kinescope-player';
import apiClient from '../../apiClient';
import Header from '../shared/Header/Header';
import SupportHint from '../shared/SupportHint';
import Skeleton from '../shared/Skeleton/Skeleton';
import RichText from '../shared/RichText';
import ExpandableText from '../shared/ExpandableText';
import { fetchModule, fetchVideoToken, invalidateCourse } from '../../api/courseApi';
import { fetchCompletedLessons, completeLesson } from '../../api/progressApi';
import { formatFileSize } from '../../shared/format';
import { parseKinescope } from '../../shared/kinescope';
import styles from './ModulePage.module.css';

/* Урок засчитывается, когда просмотрено столько ролика */
const COMPLETE_AT = 0.95;

/* Скачок времени больше этого — перемотка, а не просмотр:
   события плеера идут чаще раза в секунду */
const SEEK_GAP_SECONDS = 2;

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

/* Призрак страницы модуля: заголовок, а под ним уроки с местом под видео */
const ModuleSkeleton = () => (
  <>
    <div className={styles.head}>
      <Skeleton width={80} height={11} />
      <Skeleton width="min(100%, 380px)" height={34} />
      <Skeleton width="min(100%, 540px)" height={15} />
    </div>

    <div className={styles.lessons}>
      {[0, 1].map((i) => (
        <section key={i} className={styles.lesson}>
          <div className={styles.lessonHead}>
            <Skeleton className={styles.skNum} />
            <Skeleton width="45%" height={22} />
          </div>
          <Skeleton className={styles.skVideo} />
          <Skeleton width="min(100%, 64ch)" height={15} />
          <Skeleton width="min(80%, 52ch)" height={15} />
        </section>
      ))}
    </div>
  </>
);

const ModulePage = () => {
  const { moduleId } = useParams();
  const [module, setModule] = useState(null);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(new Set());
  const [achievement, setAchievement] = useState(false);
  const [videoToken, setVideoToken] = useState(null);
  const [videoTokenReady, setVideoTokenReady] = useState(false);
  const [ratios, setRatios] = useState({}); // lessonId → реальные пропорции из плеера
  const [moduleRatio, setModuleRatio] = useState(null); // пропорции видео модуля
  /* Сколько Kinescope-плееров уже загрузилось: плеер N+1 монтируется,
     только когда плеер N сообщил onReady (или явно не смог) */
  const [playersReady, setPlayersReady] = useState(0);
  /* Слоты, чей плеер уже создан (onInit) или явно не смог: до этого в
     контейнере крутится лоадер, чтобы не висел пустой чёрный квадрат */
  const [settledSlots, setSettledSlots] = useState(() => new Set());
  const retriedCover = useRef(false); // обложку по битой ссылке перезапрашиваем один раз
  /* lessonId → { duration, last, total }: сколько ролика реально просмотрено.
     В ref, а не в state — события времени идут часто, ререндеры тут не нужны */
  const watched = useRef({});
  const sending = useRef(new Set()); // уроки, по которым отметка уже уходит на бэк

  useEffect(() => {
    setModule(null);
    setError('');
    fetchModule(moduleId).then(setModule).catch((e) => setError(e.message));
    fetchCompletedLessons().then(setCompleted).catch(() => {});
  }, [moduleId]);

  /* Токен воспроизведения Kinescope: плеер отдаёт его Kinescope, а тот приходит
     на наш бэкенд спросить, пускать ли этого зрителя (DRM-авторизация).
     Плееры монтируем только после ответа, чтобы не пересоздавать их с токеном */
  useEffect(() => {
    if (!module) return;
    const hasKinescope =
      parseKinescope(module.videoUrl) || module.lessons?.some((l) => parseKinescope(l.videoUrl));
    if (!hasKinescope) {
      setVideoTokenReady(true);
      return;
    }
    fetchVideoToken()
      .then(setVideoToken)
      // Не получили — плеер пробует без токена (играет, пока авторизация не строгая)
      .catch(() => {})
      .finally(() => setVideoTokenReady(true));
  }, [module]);

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

  /* Подписанная ссылка на обложку живёт час — если протухла в кэше,
     сбрасываем кэш и перезапрашиваем модуль один раз */
  const handleCoverError = () => {
    if (retriedCover.current) return;
    retriedCover.current = true;
    invalidateCourse();
    fetchModule(moduleId).then(setModule).catch(() => {});
  };

  /* Очередь Kinescope-плееров: сверху вниз, по одному. Слот — вводное видео
     модуля ('intro') или id урока; следующий плеер монтируется, когда
     предыдущий загрузился. Так iframe'ы не съедают канал одновременно,
     а у каждого плеера остаётся родная кнопка запуска и preload="none" —
     само видео не качается, пока студент не нажал Play. Постер каждого
     видео грузит сам плеер (один раз, у себя в iframe) — отдельной
     предзагрузки постеров нет. */
  useEffect(() => {
    setPlayersReady(0);
    setSettledSlots(new Set());
  }, [module]);

  const kinescopeSlots = useMemo(() => {
    if (!module || module.status !== 'open') return [];
    const slots = [];
    if (parseKinescope(module.videoUrl)) slots.push('intro');
    module.lessons.forEach((l) => {
      if (parseKinescope(l.videoUrl)) slots.push(l.id);
    });
    return slots;
  }, [module]);

  /* Слот монтируется, когда очередь дошла до него (токен уже получен) */
  const canMountPlayer = (slot) =>
    videoTokenReady && kinescopeSlots.indexOf(slot) <= playersReady;

  const advancePlayerQueue = (slot) =>
    setPlayersReady((p) => Math.max(p, kinescopeSlots.indexOf(slot) + 1));

  /* Лоадер прячем по onInit, а не по onReady: обёртка подписывается на
     Ready уже после create, и на быстрой сети (кэш) событие проскакивает
     до подписки — onReady тогда не приходит вовсе. onInit же — колбэк
     самого create, он не теряется, и iframe в этот момент уже рисует
     свой интерфейс. Страховочный таймер очереди лоадеры не трогает */
  const hideLoader = (slot) =>
    setSettledSlots((s) => (s.has(slot) ? s : new Set(s).add(slot)));

  /* Плеер догрузился или явно не смог: очередь идёт дальше */
  const settleSlot = (slot) => {
    hideLoader(slot);
    advancePlayerQueue(slot);
  };

  /* Страховка: если очередной плеер молчит (ошибка, совсем плохая сеть),
     через 10 секунд пускаем следующий — очередь не должна замирать навсегда */
  useEffect(() => {
    if (!videoTokenReady || playersReady >= kinescopeSlots.length) return;
    const t = setTimeout(() => setPlayersReady((p) => p + 1), 10000);
    return () => clearTimeout(t);
  }, [videoTokenReady, playersReady, kinescopeSlots]);

  const doneCount = useMemo(
    () => (module ? module.lessons.filter((l) => completed.has(l.id)).length : 0),
    [module, completed]
  );

  /* Урок просмотрен → отмечаем на бэке. Вызывается и по концу ролика,
     и по достижению 90%; повторные вызовы отсекаем, пока летит запрос. */
  const markWatched = async (lesson) => {
    if (completed.has(lesson.id) || sending.current.has(lesson.id)) return;
    sending.current.add(lesson.id);
    try {
      const next = await completeLesson(lesson.id);
      setCompleted(new Set(next));
      const allDone = module.lessons.every((l) => next.has(l.id));
      if (allDone) setAchievement(true);
    } catch (e) {
      // Не отметилось — разрешаем следующую попытку, иначе урок «зависнет» непройденным
      sending.current.delete(lesson.id);
      console.error('Не удалось отметить урок пройденным:', e);
    }
  };

  /* Длительность приходит отдельным событием — без неё считать долю не от чего */
  const trackDuration = (lesson, duration) => {
    if (!(duration > 0)) return;
    const entry = watched.current[lesson.id] ?? { last: 0, total: 0 };
    watched.current[lesson.id] = { ...entry, duration };
  };

  /* Копим реально просмотренное время: перемотка в конец урок не засчитает,
     потому что прыжки в total не попадают */
  const trackTime = (lesson, currentTime) => {
    const entry = watched.current[lesson.id];
    if (!entry?.duration || completed.has(lesson.id)) return;
    const delta = currentTime - entry.last;
    if (delta > 0 && delta < SEEK_GAP_SECONDS) entry.total += delta;
    entry.last = currentTime;
    if (entry.total / entry.duration >= COMPLETE_AT) markWatched(lesson);
  };

  return (
    <div className={styles.page}>
      <Header
        progress={
          module && module.status === 'open'
            ? { done: doneCount, total: module.lessons.length }
            : null
        }
      />

      {/* Обложка модуля: баннер во всю ширину экрана, ~1/5 высоты */}
      {module && module.status === 'open' && module.cover && (
        <div className={styles.hero}>
          <img
            className={styles.heroImg}
            src={module.cover}
            alt=""
            decoding="async"
            onError={handleCoverError}
          />
        </div>
      )}

      <main className={styles.main}>
        <Link to="/" className={styles.backLink}>
          ← Все модули
        </Link>

        {error && (
          <p className={styles.error}>
            <SupportHint>{error}</SupportHint>
          </p>
        )}
        {!module && !error && <ModuleSkeleton />}

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

              {/* Вводное видео модуля: между заголовком и описанием.
                  Прогресс по нему не считаем — это не урок.
                  Пока плеер не поднялся — тёмный контейнер с лоадером */}
              {(() => {
                const kinescope = parseKinescope(module.videoUrl);
                if (kinescope) {
                  const aspect = moduleRatio ?? kinescope.aspectRatio;
                  return (
                    <div
                      className={styles.kinescope}
                      style={{
                        '--video-ar': aspect,
                        '--video-maxh': aspect < 1 ? '62vh' : '46vh',
                      }}
                    >
                      {!settledSlots.has('intro') && (
                        <div className={styles.videoLoader} aria-hidden="true" />
                      )}
                      {canMountPlayer('intro') && (
                        <KinescopePlayer
                          videoId={kinescope.videoId}
                          poster={module.videoCover || undefined}
                          preload="none"
                          watermark={watermark}
                          drmAuthToken={videoToken || undefined}
                          onInit={() => hideLoader('intro')}
                          onReady={() => settleSlot('intro')}
                          onInitError={() => settleSlot('intro')}
                          onJSLoadError={() => settleSlot('intro')}
                          onSizeChanged={({ width, height }) => {
                            if (width > 0 && height > 0) setModuleRatio(width / height);
                          }}
                        />
                      )}
                    </div>
                  );
                }
                if (module.videoUrl) {
                  return (
                    <video
                      className={styles.video}
                      src={module.videoUrl}
                      poster={module.videoCover || undefined}
                      controls
                      preload="none"
                      playsInline
                    />
                  );
                }
                return null;
              })()}

              <ExpandableText key={moduleId} as="div" className="lead">
                <RichText text={module.description} />
              </ExpandableText>
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
                            {!settledSlots.has(lesson.id) && (
                              <div className={styles.videoLoader} aria-hidden="true" />
                            )}
                            {canMountPlayer(lesson.id) && (
                              <KinescopePlayer
                                videoId={kinescope.videoId}
                                poster={lesson.cover || undefined}
                                preload="none"
                                watermark={watermark}
                                drmAuthToken={videoToken || undefined}
                                onInit={() => hideLoader(lesson.id)}
                                onReady={() => settleSlot(lesson.id)}
                                onInitError={() => settleSlot(lesson.id)}
                                onJSLoadError={() => settleSlot(lesson.id)}
                                onSizeChanged={({ width, height }) => {
                                  if (!(width > 0 && height > 0)) return;
                                  const ar = width / height;
                                  setRatios((r) =>
                                    Math.abs((r[lesson.id] ?? 0) - ar) < 0.01
                                      ? r
                                      : { ...r, [lesson.id]: ar }
                                  );
                                }}
                                onDurationChange={({ duration }) =>
                                  trackDuration(lesson, duration)
                                }
                                onTimeUpdate={({ currentTime }) =>
                                  trackTime(lesson, currentTime)
                                }
                                onEnded={() => markWatched(lesson)}
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
                        preload="none"
                        playsInline
                        onDurationChange={(e) => trackDuration(lesson, e.target.duration)}
                        onTimeUpdate={(e) => trackTime(lesson, e.target.currentTime)}
                        onEnded={() => markWatched(lesson)}
                      />
                    )}
                    <ExpandableText as="div" className={styles.lessonDesc}>
                      <RichText text={lesson.description} />
                    </ExpandableText>

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
