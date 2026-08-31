import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import SupportHint, { toastError } from '../shared/SupportHint';
import AdminLayout from './AdminLayout';
import apiClient from '../../apiClient';
import {
  getStudents,
  createStudent,
  createStudentsBulk,
  setStudentActive,
  setStudentRole,
  setStudentPlan,
} from '../../api/adminApi';
import styles from './Admin.module.css';

const ROLE_LABELS = { STUDENT: 'Клиент', ADMIN: 'Админ' };
const PLAN_LABELS = { SELF: 'Общий', PERSONAL: 'Персональный' };

const AdminAccountsPage = () => {
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState(null);
  const [error, setError] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null); // id аккаунта, у которого крутится запрос

  // Импорт списком — в модалке
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importPlan, setImportPlan] = useState('SELF');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Свой аккаунт: роль себе менять нельзя (бэк тоже не даст)
  const myEmail = apiClient.getJwtMetadata()?.email;

  const load = useCallback((search) => {
    getStudents(search.trim())
      .then((list) => {
        setStudents(list);
        setError('');
      })
      .catch((e) => setError(`${e.message}. Проверьте, что бэкенд запущен на :8091.`));
  }, []);

  // Поиск с дебаунсом: пустой запрос — весь список
  useEffect(() => {
    const timer = setTimeout(() => load(query), 300);
    return () => clearTimeout(timer);
  }, [query, load]);

  const addAccount = async () => {
    const email = newEmail.trim();
    if (!email) return;
    setCreating(true);
    try {
      await createStudent(email);
      toast.success('Доступ выдан');
      setNewEmail('');
      load(query);
    } catch (err) {
      toastError(err);
    } finally {
      setCreating(false);
    }
  };

  const openImport = () => {
    setImportResult(null); // отчёт прошлого импорта не должен висеть над новым списком
    setImportOpen(true);
  };

  // Во время запроса не закрываем: иначе отчёт о том, кого добавили, потеряется
  const closeImport = useCallback(() => {
    if (!importing) setImportOpen(false);
  }, [importing]);

  // Esc закрывает, фон под модалкой не скроллится
  useEffect(() => {
    if (!importOpen) return undefined;
    const onKeyDown = (e) => e.key === 'Escape' && closeImport();
    document.addEventListener('keydown', onKeyDown);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [importOpen, closeImport]);

  // Из таблицы адреса приезжают через перенос, табуляцию, запятую или ; — режем по всему сразу
  const parseEmails = (text) =>
    text
      .split(/[\s,;]+/)
      .map((part) => part.replace(/^["'<]+|["'>]+$/g, '').trim())
      .filter(Boolean);

  const parsedEmails = parseEmails(importText);

  const importAccounts = async () => {
    if (parsedEmails.length === 0) return;
    setImporting(true);
    try {
      const result = await createStudentsBulk(parsedEmails, importPlan);
      setImportResult(result);
      if (result.created > 0) {
        toast.success(`Доступ выдан: ${result.created}`);
        setImportText('');
      } else {
        toast('Новых адресов не нашлось');
      }
      load(query);
    } catch (err) {
      toastError(err);
    } finally {
      setImporting(false);
    }
  };

  // Общий обработчик правок строки: active / role / plan
  const patchStudent = async (student, action, successMessage) => {
    setBusyId(student.id);
    try {
      await action();
      toast.success(successMessage);
      load(query);
    } catch (err) {
      toastError(err);
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = (s) =>
    patchStudent(s, () => setStudentActive(s.id, !s.active), s.active ? 'Доступ отключён' : 'Доступ включён');

  const changeRole = (s, role) =>
    patchStudent(s, () => setStudentRole(s.id, role), `Права: ${ROLE_LABELS[role] ?? role}`);

  const changePlan = (s, plan) =>
    patchStudent(s, () => setStudentPlan(s.id, plan), `Формат: ${PLAN_LABELS[plan] ?? plan}`);

  return (
    <AdminLayout>
      <div className={styles.head}>
        <span className="eyebrow eyebrowAccent">Доступы</span>
        <h1 className="h2">
          Аккаунты <span className="hAccent">клиентов</span>
        </h1>
        <p className="lead">
          Кто может войти в обучение и с какими правами. Оплаченные покупки подтягиваются
          из anyforms автоматически (формат тоже), здесь доступ и права выдаются вручную.
          Отключённый аккаунт не вернёт даже покупка — только кнопка «Включить».
        </p>
      </div>

      {error && (
        <p className={styles.error}>
          <SupportHint>{error}</SupportHint>
        </p>
      )}

      <div className={`${styles.row} ${styles.createRow}`}>
        <input
          className="input"
          type="email"
          placeholder="Email нового аккаунта"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addAccount()}
        />
        <button
          type="button"
          className="btn"
          disabled={creating || !newEmail.trim()}
          onClick={addAccount}
        >
          + Дать доступ
        </button>
      </div>

      <div className={styles.importBox}>
        <button type="button" className={styles.smallBtn} onClick={openImport}>
          Импортировать списком
        </button>
      </div>

      <div className={styles.block}>
        <input
          className="input"
          type="search"
          placeholder="Поиск по email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {!students && !error && <p className={styles.loading}>Загружаем…</p>}

        {students && students.length === 0 && (
          <p className={styles.hint}>
            {query.trim() ? 'По такому email никого нет.' : 'Аккаунтов пока нет.'}
          </p>
        )}

        {students && students.length > 0 && (
          <div className={styles.accountList}>
            {students.map((s) => {
              const isSelf = s.email === myEmail;
              const busy = busyId === s.id;
              return (
                <div
                  key={s.id}
                  className={`${styles.accountRow} ${s.active ? '' : styles.accountInactive}`}
                >
                  <span className={styles.accountEmail}>{s.email}</span>

                  <label className={styles.accountField}>
                    <span className={styles.accountCaption}>права</span>
                    <select
                      className={styles.accountSelect}
                      value={s.role || 'STUDENT'}
                      disabled={busy || isSelf}
                      title={isSelf ? 'Себе права менять нельзя' : undefined}
                      onChange={(e) => changeRole(s, e.target.value)}
                    >
                      <option value="STUDENT">Клиент</option>
                      <option value="ADMIN">Админ</option>
                    </select>
                  </label>

                  <label className={styles.accountField}>
                    <span className={styles.accountCaption}>формат</span>
                    <select
                      className={styles.accountSelect}
                      value={s.plan || ''}
                      disabled={busy}
                      onChange={(e) => e.target.value && changePlan(s, e.target.value)}
                    >
                      {!s.plan && <option value="">не задан</option>}
                      <option value="SELF">Общий</option>
                      <option value="PERSONAL">Персональный</option>
                    </select>
                  </label>

                  {!s.active && (
                    <span className={`${styles.accountPlan} ${styles.accountOff}`}>отключён</span>
                  )}
                  <button
                    type="button"
                    className={`${styles.smallBtn} ${s.active ? styles.danger : ''}`}
                    disabled={busy}
                    onClick={() => toggleActive(s)}
                  >
                    {s.active ? 'Деактивировать' : 'Включить'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {importOpen && (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onMouseDown={(e) => e.target === e.currentTarget && closeImport()}
        >
          <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Импорт клиентов">
            <div className={styles.modalHead}>
              <h2 className={styles.blockTitle}>Импорт клиентов списком</h2>
              <button
                type="button"
                className={styles.modalClose}
                aria-label="Закрыть"
                onClick={closeImport}
              >
                ×
              </button>
            </div>

            <textarea
              className={`input ${styles.textarea}`}
              rows={8}
              autoFocus
              placeholder="Вставьте email из таблицы — по одному в строке, можно через запятую"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />

            <p className={styles.hint}>
              Аккаунты, которые уже есть, импорт не трогает — ни доступ, ни формат.
            </p>

            {importResult && (
              <div className={styles.importReport}>
                <p className={styles.hint}>Добавлено: {importResult.created}</p>
                {importResult.existing.length > 0 && (
                  <p className={styles.hint}>
                    Уже были ({importResult.existing.length}): {importResult.existing.join(', ')}
                  </p>
                )}
                {importResult.invalid.length > 0 && (
                  <p className={`${styles.hint} ${styles.importBad}`}>
                    Не похоже на email ({importResult.invalid.length}):{' '}
                    {importResult.invalid.join(', ')}
                  </p>
                )}
              </div>
            )}

            <div className={`${styles.row} ${styles.rowBottom} ${styles.modalFoot}`}>
              <label className={styles.accountField}>
                <span className={styles.accountCaption}>формат</span>
                <select
                  className={styles.accountSelect}
                  value={importPlan}
                  onChange={(e) => setImportPlan(e.target.value)}
                >
                  <option value="SELF">Общий</option>
                  <option value="PERSONAL">Персональный</option>
                </select>
              </label>
              <span className={styles.hint}>Распознано адресов: {parsedEmails.length}</span>
              <button type="button" className={styles.smallBtn} onClick={closeImport}>
                Закрыть
              </button>
              <button
                type="button"
                className="btn"
                disabled={importing || parsedEmails.length === 0}
                onClick={importAccounts}
              >
                {importing ? 'Импортируем…' : 'Выдать доступ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminAccountsPage;
