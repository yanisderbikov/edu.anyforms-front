import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../shared/Header/Header';
import SupportHint from '../shared/SupportHint';
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

/** Пауза между отправками кода — как RESEND_COOLDOWN на бэке */
const RESEND_SECONDS = 30;

const Login = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendLeft, setResendLeft] = useState(0);

  useEffect(() => {
    if (resendLeft <= 0) return undefined;
    const id = setInterval(() => setResendLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [resendLeft > 0]);

  const submitEmail = async (e) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError('Введите корректный e-mail');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await requestCode(email.trim());
      // Живой код уже есть (запрашивали недавно) — всё равно пускаем вводить
      setNotice(res.alreadySent ? 'Код уже отправляли на эту почту — проверьте письмо.' : '');
      setResendLeft(RESEND_SECONDS);
      setStep('code');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    if (busy || resendLeft > 0) return;
    setBusy(true);
    setError('');
    try {
      const res = await requestCode(email.trim());
      setNotice(res.alreadySent
        ? 'Код уже отправляли — проверьте письмо.'
        : 'Отправили новый код. Старый больше не подойдёт.');
      setResendLeft(RESEND_SECONDS);
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
            {/* Единственная публичная страница: сюда попадает и анонимный
                посетитель, и поисковик — поэтому прямо в тексте сказано,
                что это за платформа и какой здесь курс */}
            <span className="eyebrow">Платформа обучения anyforms</span>

            {step === 'email' ? (
              <>
                <h1 className={`h2 ${styles.title}`}>
                  {getGreeting()}! <span className="hAccent">Войдите</span>, чтобы начать
                </h1>
                <p className="lead">
                  Здесь проходит курс по производству силиконовых форм. Введите e-mail,
                  на который вы его купили, — мы пришлём код для входа.
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
                  {error && (
                    <span className={styles.error}>
                      <SupportHint>{error}</SupportHint>
                    </span>
                  )}
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
                  {notice && !error && <span className={styles.notice}>{notice}</span>}
                  {error && (
                    <span className={styles.error}>
                      <SupportHint>{error}</SupportHint>
                    </span>
                  )}
                  <button type="submit" className="btn" disabled={busy}>
                    {busy ? 'Проверяем…' : 'Войти'}
                    <span className="btnArrow">
                      <ArrowIcon />
                    </span>
                  </button>
                  <div className={styles.formLinks}>
                    <button
                      type="button"
                      className={styles.backLink}
                      onClick={resendCode}
                      disabled={busy || resendLeft > 0}
                    >
                      {resendLeft > 0
                        ? `Отправить код ещё раз (${resendLeft} с)`
                        : 'Отправить код ещё раз'}
                    </button>
                    <button
                      type="button"
                      className={styles.backLink}
                      onClick={() => {
                        setStep('email');
                        setCode('');
                        setError('');
                        setNotice('');
                        setResendLeft(0);
                      }}
                    >
                      ← Другой e-mail
                    </button>
                  </div>
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
