import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../shared/Header/Header';
import { finishOnboarding } from '../../auth';
import { fetchCourse } from '../../api/courseApi';
import styles from './Onboarding.module.css';

const ArrowIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4.5 12h15M13.5 6l6 6-6 6"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* Онбординг сделан «живым кодом»: тексты слайдов собираются здесь,
   данные курса (название, модули, ссылки) подтягиваются из JSON. */
const buildSlides = (data) => {
  const title = data?.course?.title || 'курсе';
  const modules = data?.modules || [];
  const support = data?.support;

  return [
    {
      key: 'hello',
      eyebrow: 'Добро пожаловать',
      title: (
        <>
          Рады видеть вас на курсе{' '}
          <span className="hAccent">«{title}»</span>
        </>
      ),
      note: 'Пара минут — расскажем, как здесь всё устроено.',
    },
    {
      key: 'count',
      eyebrow: 'Как устроен курс',
      title: (
        <>
          На курсе будет <span className="hAccent">{modules.length || 3} модуля</span>
        </>
      ),
      note: 'Они открываются по очереди — от простого к сложному.',
    },
    ...modules.map((m, i) => ({
      key: m.id,
      eyebrow: `Модуль ${i + 1}`,
      title: <span className="hAccent">{m.title}</span>,
      points: m.points,
      image: m.image,
    })),
    {
      key: 'support',
      eyebrow: 'Мы рядом',
      title: (
        <>
          Мы всегда <span className="hAccent">на связи</span>
        </>
      ),
      note: 'Вопрос по уроку или что-то не работает — пишите, отвечаем быстро.',
      links: support && [
        { label: support.chatLabel, url: support.chatUrl },
        { label: support.supportLabel, url: support.supportUrl },
      ],
    },
    {
      key: 'go',
      eyebrow: 'Всё готово',
      title: (
        <>
          Ну что, <span className="hAccent">поехали?</span>
        </>
      ),
      note: 'Первый модуль уже открыт и ждёт вас.',
      isLast: true,
    },
  ];
};

const SLIDE_MS = 260; // длительность анимации ухода слайда (синхронно с CSS)
const FINISH_MS = 420; // длительность «улёта» при завершении онбординга (синхронно с CSS)

const Onboarding = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1); // 1 — вперёд, -1 — назад
  const [leaving, setLeaving] = useState(false);
  const [finishing, setFinishing] = useState(false); // онбординг закрывается — всё улетает вверх
  const touchStart = useRef(null);

  useEffect(() => {
    fetchCourse().then(setData).catch(() => setData({}));
  }, []);

  const slides = useMemo(() => buildSlides(data), [data]);
  const slide = slides[Math.min(index, slides.length - 1)];

  /* Переход: старый слайд уезжает, затем новый въезжает с той же стороны */
  const go = (nextIndex, direction) => {
    if (leaving) return;
    setDir(direction);
    setLeaving(true);
    setTimeout(() => {
      setIndex(nextIndex);
      setLeaving(false);
    }, SLIDE_MS);
  };

  const next = () => {
    if (slide.isLast) {
      if (finishing) return;
      setFinishing(true);
      setTimeout(() => {
        finishOnboarding();
        navigate('/', { replace: true });
      }, FINISH_MS);
    } else {
      go(index + 1, 1);
    }
  };

  const back = () => {
    if (index > 0) go(index - 1, -1);
  };

  /* Свайпы на тач-экранах */
  const onTouchStart = (e) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const onTouchEnd = (e) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0 && !slide.isLast) next();
    if (dx > 0) back();
  };

  const motionClass = leaving
    ? dir === 1
      ? styles.leaveLeft
      : styles.leaveRight
    : dir === 1
      ? styles.enterRight
      : styles.enterLeft;

  return (
    <div
      className={`${styles.page} ${finishing ? styles.pageFinishing : ''}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <Header />
      {/* Мобильный порядок: заголовок — фото — описание.
          На ПК фото уходит в правую колонку (половина экрана, квадратное). */}
      <main
        className={`${styles.main} ${slide.image ? styles.withImage : ''} ${motionClass}`}
        key={index}
      >
        <span className="eyebrow eyebrowAccent">{slide.eyebrow}</span>
        <h1 className={`h1 ${styles.title}`}>{slide.title}</h1>

        {slide.image && (
          <img className={styles.image} src={slide.image} alt="" loading="lazy" />
        )}

        {slide.note && <p className={`lead ${styles.note}`}>{slide.note}</p>}

        {slide.points && (
          <ul className={styles.points}>
            {slide.points.map((p) => (
              <li key={p} className={styles.point}>
                <span className={styles.pointArrow}>→</span>
                {p}
              </li>
            ))}
          </ul>
        )}

        {slide.links && (
          <div className={styles.links}>
            {slide.links.map((l) => (
              <a
                key={l.url}
                className={`btn btnGhost ${styles.linkBtn}`}
                href={l.url}
                target="_blank"
                rel="noreferrer"
              >
                {l.label} ↗
              </a>
            ))}
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <div className={styles.dots}>
          {slides.map((s, i) => (
            <span
              key={s.key}
              className={`${styles.dot} ${i === index ? styles.dotActive : ''}`}
            />
          ))}
        </div>
        <div className={styles.controls}>
          {/* Кнопка есть всегда: на первом слайде схлопнута («Далее» слева),
              дальше плавно разъезжается и сдвигает «Далее» вправо */}
          <button
            type="button"
            className={`${styles.backBtn} ${index > 0 ? styles.backBtnVisible : ''}`}
            onClick={back}
            disabled={index === 0}
            aria-hidden={index === 0}
            tabIndex={index === 0 ? -1 : 0}
          >
            ← Назад
          </button>
          <button type="button" className={`btn ${styles.nextBtn}`} onClick={next}>
            {slide.isLast ? 'Поехали!' : 'Далее'}
            <span className="btnArrow">
              <ArrowIcon />
            </span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Onboarding;
