import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../shared/Header/Header';
import LegalFooter from '../shared/LegalFooter/LegalFooter';
import SupportHint from '../shared/SupportHint';
import Skeleton from '../shared/Skeleton/Skeleton';
import ProgressRing from '../shared/ProgressRing';
import RichText from '../shared/RichText';
import { getAuth, logout } from '../../auth';
import { fetchCourse, invalidateCourse } from '../../api/courseApi';
import styles from './Home.module.css';

const PersonIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const ChatIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-2.9-.36-4.1-1L3 20l1.05-5.2A8.5 8.5 0 1 1 21 11.5Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

// opensAt приходит московским временем «2026-09-01T14:00»; полночь = «в этот день»,
// время не показываем
const formatOpensAt = (iso) => {
  if (!iso) return 'Скоро откроется';
  const [day, time] = iso.split('T');
  const dayText = new Date(`${day}T00:00:00`)
    .toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  return time && time !== '00:00'
    ? `Откроется ${dayText} в ${time} (мск)`
    : `Откроется ${dayText}`;
};

/* Призрак главной: та же сетка и те же карточки, только вместо содержимого —
   серые блоки. Пользователь сразу видит, куда что встанет, и не смотрит в пустоту */
const HomeSkeleton = () => (
  <>
    <div className={styles.headRow}>
      <div className={styles.head}>
        <Skeleton width={90} height={11} />
        <Skeleton width="min(100%, 420px)" height={34} />
        <Skeleton width="min(100%, 560px)" height={15} />
        <Skeleton width="min(100%, 380px)" height={15} />
      </div>
      <Skeleton className={styles.skRing} />
    </div>

    <div className={styles.grid}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={styles.card}>
          <div className={styles.cardImageWrap}>
            <Skeleton className={styles.skImage} />
          </div>
          <div className={styles.cardHead}>
            <Skeleton className={styles.skNum} />
            <Skeleton width="55%" height={19} />
          </div>
          <Skeleton height={13} />
          <Skeleton width="72%" height={13} />
          <Skeleton width="40%" height={13} />
        </div>
      ))}
    </div>
  </>
);

const Home = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const [imageRetried, setImageRetried] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const accountRef = useRef(null);

  useEffect(() => {
    fetchCourse().then(setData).catch((e) => setError(e.message));
  }, []);

  /* Кэш главной живёт сутки, а подписанные ссылки на картинки — час.
     Картинка не открылась → ссылка протухла: сбрасываем кэш и берём свежие.
     Одна попытка, иначе по-настоящему битая картинка зациклит запросы */
  const handleImageError = () => {
    if (imageRetried) return;
    setImageRetried(true);
    invalidateCourse();
    fetchCourse().then(setData).catch(() => {});
  };

  /** Сколько уроков модуля досмотрено — счётчик приходит с бэкенда */
  const doneInModule = (m) => m.lessonsDone;

  /** Модуль пройден = есть уроки и все досмотрены */
  const isModuleDone = (m) => m.lessonsCount > 0 && m.lessonsDone === m.lessonsCount;

  // Закрываем меню ЛК по клику мимо
  useEffect(() => {
    if (!accountOpen) return undefined;
    const onClick = (e) => {
      if (!accountRef.current?.contains(e.target)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [accountOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const account = (
    <div className={styles.account} ref={accountRef}>
      <button
        type="button"
        className={styles.iconBtn}
        aria-label="Личный кабинет"
        onClick={() => setAccountOpen((v) => !v)}
      >
        <PersonIcon />
      </button>
      {accountOpen && (
        <div className={styles.accountMenu}>
          <span className={styles.accountEmail}>{getAuth()?.email}</span>
          <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
            Выйти
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.page}>
      <Header right={account} />

      <main className={styles.main}>
        {error && (
          <p className={styles.error}>
            <SupportHint>{error}</SupportHint>
          </p>
        )}
        {!data && !error && <HomeSkeleton />}

        {data && (
          <>
            <div className={styles.headRow}>
              <div className={styles.head}>
                <span className="eyebrow eyebrowAccent">Ваш курс</span>
                <h1 className="h2">
                  {data.course.title.split(' ')[0]}{' '}
                  <span className="hAccent">
                    {data.course.title.split(' ').slice(1).join(' ')}
                  </span>
                </h1>
                <div className="lead">
                  <RichText text={data.course.subtitle} />
                </div>
              </div>
              {/* Сводка: сколько модулей пройдено целиком.
                  Десктоп — крупное кольцо, мобилка — компактное напротив заголовка */}
              <ProgressRing
                done={data.modules.filter(isModuleDone).length}
                total={data.modules.length}
                size={96}
                stroke={7}
                mobileSize={64}
                mobileStroke={5}
                caption="пройдено"
              />
            </div>

            <div className={styles.grid}>
              {data.modules.map((m) => {
                const locked = m.status !== 'open';
                const inner = (
                  <>
                    {m.image && (
                      <div className={styles.cardImageWrap}>
                        <img
                          className={styles.cardImage}
                          src={m.image}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          onError={handleImageError}
                        />
                      </div>
                    )}
                    <div className={styles.cardHead}>
                      <span className={`${styles.num} ${locked ? styles.numLocked : ''}`}>
                        {locked ? <LockIcon /> : m.order}
                      </span>
                      <h2 className="h3">{m.title}</h2>
                      {!locked && m.lessonsCount > 0 && (
                        <span className={styles.cardRing}>
                          <ProgressRing done={doneInModule(m)} total={m.lessonsCount} size={44} stroke={4} />
                        </span>
                      )}
                    </div>
                    <div className={styles.cardDesc}>
                      <RichText text={m.description} plainLinks />
                    </div>
                    <span className={locked ? styles.cardLockNote : styles.cardOpenNote}>
                      {locked
                        ? formatOpensAt(m.opensAt)
                        : `${m.lessonsCount} ${m.lessonsCount === 1 ? 'урок' : 'урока'} · Смотреть →`}
                    </span>
                  </>
                );

                return locked ? (
                  <div key={m.id} className={`${styles.card} ${styles.cardLocked}`}>
                    {inner}
                  </div>
                ) : (
                  <Link key={m.id} to={`/module/${m.id}`} className={styles.card}>
                    {inner}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>

      <LegalFooter />

      {/* Плавающая кнопка поддержки справа снизу */}
      {data?.support && (
        <div className={styles.support}>
          {supportOpen && (
            <div className={styles.supportMenu}>
              <a href={data.support.chatUrl} target="_blank" rel="noreferrer">
                {data.support.chatLabel} ↗
              </a>
              <a href={data.support.supportUrl} target="_blank" rel="noreferrer">
                {data.support.supportLabel} ↗
              </a>
            </div>
          )}
          <button
            type="button"
            className={styles.supportBtn}
            aria-label="Поддержка"
            onClick={() => setSupportOpen((v) => !v)}
          >
            <ChatIcon />
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;
