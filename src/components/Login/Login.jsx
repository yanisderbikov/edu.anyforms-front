import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../shared/Header/Header';
import { requestCode, verifyCode } from '../../auth';
import styles from './Login.module.css';

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

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/* Приветствие по локальному времени пользователя */
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Доброе утро';
  if (hour >= 12 && hour < 18) return 'Добрый день';
  if (hour >= 18 && hour < 23) return 'Добрый вечер';
  return 'Доброй ночи';
};

const Login = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submitEmail = async (e) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError('Введите корректный e-mail');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await requestCode(email.trim());
      setStep('code');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e) => {
    e.preventDefault();
    if (code.trim().length < 4) {
      setError('Введите код из письма');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await verifyCode(email.trim(), code.trim());
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <div className={styles.grid}>
          {/* Слева — статичное фото, чтобы не отвлекать от формы входа */}
          <img
            className={styles.heroImage}
            src="/login.jpeg"
            alt=""
            aria-hidden="true"
          />

          <div className={styles.formCol}>
            <span className="eyebrow">Вход на платформу</span>

            {step === 'email' ? (
              <>
                <h1 className={`h2 ${styles.title}`}>
                  {getGreeting()}! <span className="hAccent">Войдите</span>, чтобы начать
                </h1>
                <p className="lead">
                  Введите e-mail, на который куплен курс, — мы пришлём код для входа.
                </p>
                <form className={styles.form} onSubmit={submitEmail}>
                  <input
                    className="input"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                  />
                  {error && <span className={styles.error}>{error}</span>}
                  <button type="submit" className="btn" disabled={busy}>
                    {busy ? 'Отправляем…' : 'Получить код'}
                    <span className="btnArrow">
                      <ArrowIcon />
                    </span>
                  </button>
                </form>
              </>
            ) : (
              <>
                <h1 className={`h2 ${styles.title}`}>
                  Код <span className="hAccent">на почте</span>
                </h1>
                <p className="lead">
                  Отправили код на <b>{email}</b>. Вставьте его сюда, чтобы войти.
                </p>
                <form className={styles.form} onSubmit={submitCode}>
                  <input
                    className={`input ${styles.codeInput}`}
                    type="text"
                    inputMode="numeric"
                    placeholder="••••••"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    autoFocus
                  />
                  {error && <span className={styles.error}>{error}</span>}
                  <button type="submit" className="btn" disabled={busy}>
                    {busy ? 'Проверяем…' : 'Войти'}
                    <span className="btnArrow">
                      <ArrowIcon />
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.backLink}
                    onClick={() => {
                      setStep('email');
                      setCode('');
                      setError('');
                    }}
                  >
                    ← Другой e-mail
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
