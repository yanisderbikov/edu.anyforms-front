import React, { useEffect, useMemo, useState } from 'react';
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
          Рады видеть тебя на курсе{' '}
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
      note: m.description,
    })),
    {
      key: 'support',
      eyebrow: 'Мы рядом',
      title: (
        <>
          Мы всегда <span className="hAccent">на связи</span>
        </>
      ),
      note: 'Вопрос по уроку или что-то не работает — пиши, отвечаем быстро.',
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
      note: 'Первый модуль уже открыт и ждёт тебя.',
      isLast: true,
    },
  ];
};

const Onboarding = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetchCourse().then(setData).catch(() => setData({}));
  }, []);

  const slides = useMemo(() => buildSlides(data), [data]);
  const slide = slides[Math.min(index, slides.length - 1)];

  const next = () => {
    if (slide.isLast) {
      finishOnboarding();
      navigate('/', { replace: true });
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main} key={slide.key}>
        <span className="eyebrow eyebrowAccent">{slide.eyebrow}</span>
        <h1 className={`h1 ${styles.title}`}>{slide.title}</h1>
        {slide.note && <p className={`lead ${styles.note}`}>{slide.note}</p>}

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
          {index > 0 && (
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => setIndex((i) => i - 1)}
            >
              ← Назад
            </button>
          )}
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
