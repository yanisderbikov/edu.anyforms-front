import React, { useRef, useState } from 'react';
import { Navigate, NavLink } from 'react-router-dom';
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

/** Каркас админки: шапка, вкладки разделов, защита по роли */
const AdminLayout = ({ children }) => {
  // Не админ — молча уводим на главную, как и при 403 от API (см. apiClient).
  // Гостя с главной дальше отправит RequireAuth — на логин.
  if (!isAdmin()) {
    return <Navigate to="/" replace />;
  }

  const tabClass = ({ isActive }) =>
    `${styles.tab} ${isActive ? styles.tabActive : ''}`;

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <nav className={styles.tabs}>
          <NavLink to="/admin/course" className={tabClass}>
            Курс
          </NavLink>
          <NavLink to="/admin/onboarding" className={tabClass}>
            Онбординг
          </NavLink>
        </nav>
        {children}
      </main>
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
