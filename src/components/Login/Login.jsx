import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../shared/Header/Header';
import { login } from '../../auth';
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

const Login = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const submitEmail = (e) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError('Введите корректный e-mail');
      return;
    }
    setError('');
    // Без бэкенда: делаем вид, что код отправлен на почту
    setStep('code');
  };

  const submitCode = (e) => {
    e.preventDefault();
    if (code.trim().length < 4) {
      setError('Введите код из письма');
      return;
    }
    setError('');
    // Без бэкенда: принимаем любой код
    login(email.trim());
    navigate('/', { replace: true });
  };

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <div className={styles.grid}>
          {/* Слева — картинка-подсказка, как войти (пока заглушка) */}
          <div className={styles.ph} aria-hidden="true">
            <span className={styles.phLabel}>
              Картинка: вводишь e-mail — получаешь код на почту — входишь
            </span>
          </div>

          <div className={styles.formCol}>
            <span className="eyebrow">Вход на платформу</span>

            {step === 'email' ? (
              <>
                <h1 className={`h2 ${styles.title}`}>
                  Привет! <span className="hAccent">Войди</span>, чтобы начать
                </h1>
                <p className="lead">
                  Введи e-mail, на который куплен курс, — мы пришлём код для входа.
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
                  <button type="submit" className="btn">
                    Получить код
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
                  Отправили код на <b>{email}</b>. Вставь его сюда, чтобы войти.
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
                  <button type="submit" className="btn">
                    Войти
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
