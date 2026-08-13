import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../shared/Header/Header';
import { getAuth, logout } from '../../auth';
import { fetchCourse } from '../../api/courseApi';
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

const formatOpensAt = (iso) => {
  if (!iso) return 'Скоро откроется';
  const date = new Date(`${iso}T00:00:00`);
  return `Откроется ${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`;
};

const Home = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const accountRef = useRef(null);

  useEffect(() => {
    fetchCourse().then(setData).catch((e) => setError(e.message));
  }, []);

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

      <main className={`container ${styles.main}`}>
        {error && <p className={styles.error}>{error}</p>}
        {!data && !error && <p className={styles.loading}>Загружаем курс…</p>}

        {data && (
          <>
            <div className={styles.head}>
              <span className="eyebrow eyebrowAccent">Твой курс</span>
              <h1 className="h2">
                {data.course.title.split(' ')[0]}{' '}
                <span className="hAccent">
                  {data.course.title.split(' ').slice(1).join(' ')}
                </span>
              </h1>
              <p className="lead">{data.course.subtitle}</p>
            </div>

            <div className={styles.grid}>
              {data.modules.map((m) => {
                const locked = m.status !== 'open';
                const inner = (
                  <>
                    <div className={styles.cardHead}>
                      <span className={`${styles.num} ${locked ? styles.numLocked : ''}`}>
                        {locked ? <LockIcon /> : m.order}
                      </span>
                      <h2 className="h3">{m.title}</h2>
                    </div>
                    <p className={styles.cardDesc}>{m.description}</p>
                    <span className={locked ? styles.cardLockNote : styles.cardOpenNote}>
                      {locked
                        ? formatOpensAt(m.opensAt)
                        : `${m.lessons.length} ${m.lessons.length === 1 ? 'урок' : 'урока'} · Смотреть →`}
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
