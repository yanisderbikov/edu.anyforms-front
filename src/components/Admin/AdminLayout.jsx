import React, { useEffect, useRef, useState } from 'react';
import { Navigate, NavLink, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import SupportHint, { toastError } from '../shared/SupportHint';
import Header from '../shared/Header/Header';
import { isAdmin } from '../../auth';
import {
  presignUpload,
  uploadToS3,
  createKinescopeUploadLink,
  uploadToKinescope,
} from '../../api/adminApi';
import styles from './Admin.module.css';

/* Меню сайдбара: группы с подпунктами — как в админке anyforms-front */
const MENU = [
  {
    title: 'обучение',
    items: [
      { to: '/admin/course', label: 'Курс' },
      { to: '/admin/onboarding', label: 'Онбординг' },
    ],
  },
  {
    title: 'доступы',
    items: [{ to: '/admin/accounts', label: 'Аккаунты' }],
  },
];

/** Каркас админки: шапка, сайдбар с разделами (на мобиле — бургер), защита по роли */
const AdminLayout = ({ children }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Перешли на другую страницу — мобильное меню закрываем
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Пока открыт мобильный drawer, фон не скроллим
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  // Не админ — молча уводим на главную, как и при 403 от API (см. apiClient).
  // Гостя с главной дальше отправит RequireAuth — на логин.
  if (!isAdmin()) {
    return <Navigate to="/" replace />;
  }

  // Без end: «Курс» остаётся активным и внутри модуля (/admin/course/:id)
  const linkClass = ({ isActive }) =>
    `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`;

  const nav = (
    <nav className={styles.nav}>
      {MENU.map((section) => (
        <div key={section.title} className={styles.navSection}>
          <p className={styles.navTitle}>{section.title}</p>
          {section.items.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );

  const burger = (
    <button
      type="button"
      className={styles.burger}
      aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
      aria-expanded={menuOpen}
      onClick={() => setMenuOpen((prev) => !prev)}
    >
      <span className={`${styles.burgerLine} ${menuOpen ? styles.burgerLineTop : ''}`} />
      <span className={`${styles.burgerLine} ${menuOpen ? styles.burgerLineHidden : ''}`} />
      <span className={`${styles.burgerLine} ${menuOpen ? styles.burgerLineBottom : ''}`} />
    </button>
  );

  return (
    <div className={styles.page}>
      <Header left={burger} />

      <aside className={styles.sidebar}>{nav}</aside>

      {menuOpen && (
        <>
          <div className={styles.backdrop} onClick={() => setMenuOpen(false)} />
          <aside className={styles.drawer}>{nav}</aside>
        </>
      )}

      <div className={styles.content}>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
};

/** Загрузка напрямую в S3: бэкенд подписывает URL, файл идёт мимо него */
export const DirectUploadButton = ({
  prefix,
  onUploaded,
  label,
  doneMessage = 'Файл загружен — не забудьте сохранить',
}) => {
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null); // null = не грузим, число = %

  const onChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setProgress(0);
    try {
      const { uploadUrl, key } = await presignUpload(file.name, file.type, prefix);
      await uploadToS3(uploadUrl, file, setProgress);
      // await — если обработчик сам сохраняет на бэке, ошибка попадёт в catch
      await onUploaded(key, file);
      toast.success(doneMessage);
    } catch (err) {
      toastError(err);
    } finally {
      setProgress(null);
    }
  };

  return (
    <>
      <button
        type="button"
        className={styles.smallBtn}
        disabled={progress !== null}
        onClick={() => inputRef.current?.click()}
      >
        {progress !== null ? `Загружаем… ${progress}%` : label}
      </button>
      <input ref={inputRef} type="file" hidden onChange={onChange} />
    </>
  );
};

/** Загрузка видео урока в Kinescope: бэкенд создаёт upload-ссылку, файл идёт мимо него */
export const KinescopeUploadButton = ({ onUploaded, label = 'Загрузить видео' }) => {
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null); // null = не грузим, число = %

  const onChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setProgress(0);
    try {
      const link = await createKinescopeUploadLink(file.name, file.size);
      const uploaded = await uploadToKinescope(link.endpoint, file, setProgress);
      // id видео обычно известен уже из upload-ссылки; ответ загрузки — надёжнее
      const videoId = uploaded?.data?.id || link.videoId;
      const embedUrl = videoId ? `https://kinescope.io/embed/${videoId}` : link.embedUrl;
      await onUploaded(embedUrl, file);
      toast.success('Видео уехало в Kinescope. Дождитесь обработки и сохраните урок');
    } catch (err) {
      toastError(err);
    } finally {
      setProgress(null);
    }
  };

  return (
    <>
      <button
        type="button"
        className={styles.smallBtn}
        disabled={progress !== null}
        onClick={() => inputRef.current?.click()}
      >
        {progress !== null ? `Загружаем… ${progress}%` : label}
      </button>
      <input ref={inputRef} type="file" accept="video/*" hidden onChange={onChange} />
    </>
  );
};

export default AdminLayout;
