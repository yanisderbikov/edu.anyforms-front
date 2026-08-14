import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminLayout, { DirectUploadButton } from './AdminLayout';
import {
  getAdminCourse,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
} from '../../api/adminApi';
import styles from './Admin.module.css';

/* ── Урок: номер, заголовок, видео, описание ── */
const LessonRow = ({ lesson, moduleId, onChanged }) => {
  const isNew = !lesson.id;
  const [form, setForm] = useState({
    order: lesson.order ?? 1,
    title: lesson.title ?? '',
    description: lesson.description ?? '',
    videoUrl: lesson.videoKey ?? '',
  });
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const save = async () => {
    setBusy(true);
    try {
      const payload = { ...form, order: Number(form.order) };
      if (isNew) {
        await createLesson(moduleId, payload);
        toast.success('Урок добавлен');
      } else {
        await updateLesson(lesson.id, payload);
        toast.success('Урок сохранён');
      }
      onChanged();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Удалить урок «${form.title}»?`)) return;
    try {
      await deleteLesson(lesson.id);
      toast.success('Урок удалён');
      onChanged();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className={styles.lesson}>
      <div className={`${styles.row} ${styles.rowBottom}`}>
        <label className={styles.ordLabel}>
          <span className={styles.ordCaption}>Урок №</span>
          <input
            className={`input ${styles.ordInput}`}
            type="number"
            value={form.order}
            onChange={set('order')}
          />
        </label>
        <input
          className="input"
          placeholder="Название урока"
          value={form.title}
          onChange={set('title')}
        />
      </div>

      <div className={styles.row}>
        <input
          className="input"
          placeholder="Видео: ссылка или ключ в бакете"
          value={form.videoUrl}
          onChange={set('videoUrl')}
        />
        <DirectUploadButton
          prefix="videos"
          label="Загрузить видео"
          onUploaded={(key) => setForm((f) => ({ ...f, videoUrl: key }))}
        />
      </div>

      <textarea
        className={`input ${styles.textarea}`}
        placeholder="Описание под видео"
        rows={2}
        value={form.description}
        onChange={set('description')}
      />

      <div className={styles.row}>
        <button type="button" className={styles.smallBtn} disabled={busy} onClick={save}>
          {isNew ? 'Добавить урок' : 'Сохранить'}
        </button>
        {!isNew && (
          <button type="button" className={`${styles.smallBtn} ${styles.danger}`} onClick={remove}>
            Удалить
          </button>
        )}
      </div>
    </div>
  );
};

const AdminModulePage = () => {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const [module, setModule] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);
  const [addingLesson, setAddingLesson] = useState(false);

  const load = useCallback(() => {
    getAdminCourse()
      .then((d) => {
        const found = d.modules.find((m) => m.id === moduleId);
        if (!found) {
          setError('Модуль не найден');
          return;
        }
        setModule(found);
        setForm({
          order: found.order,
          title: found.title,
          description: found.description ?? '',
          opensAt: found.opensAt ?? '',
        });
        setError('');
        setAddingLesson(false);
      })
      .catch((e) => setError(`${e.message}. Проверьте, что бэкенд запущен на :8091.`));
  }, [moduleId]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const removeModule = async () => {
    if (!window.confirm(`Удалить модуль «${form.title}» вместе с уроками?`)) return;
    try {
      await deleteModule(moduleId);
      toast.success('Модуль удалён');
      navigate('/admin/course', { replace: true });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const saveModule = async () => {
    try {
      await updateModule(moduleId, {
        order: Number(form.order),
        title: form.title,
        description: form.description,
        opensAt: form.opensAt || null,
      });
      toast.success('Модуль сохранён');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <AdminLayout>
      <Link to="/admin/course" className={styles.backLink}>
        ← Все модули
      </Link>

      {error && <p className={styles.error}>{error}</p>}
      {!module && !error && <p className={styles.loading}>Загружаем…</p>}

      {module && form && (
        <>
          <div className={styles.head}>
            <span className="eyebrow eyebrowAccent">Модуль {module.order}</span>
            <h1 className="h2">
              <span className="hAccent">{module.title}</span>
            </h1>
          </div>

          <section className={`card ${styles.block}`}>
            <h3 className={styles.blockTitle}>О модуле</h3>
            <div className={`${styles.row} ${styles.rowBottom}`}>
              <label className={styles.ordLabel}>
                <span className={styles.ordCaption}>Порядок</span>
                <input
                  className={`input ${styles.ordInput}`}
                  type="number"
                  value={form.order}
                  onChange={set('order')}
                />
              </label>
              <input className="input" placeholder="Название" value={form.title} onChange={set('title')} />
            </div>
            <textarea
              className={`input ${styles.textarea}`}
              placeholder="Описание"
              rows={2}
              value={form.description}
              onChange={set('description')}
            />
            <label className={styles.dateLabel}>
              Дата открытия (пусто = открыт сразу)
              <input
                className={`input ${styles.dateInput}`}
                type="date"
                value={form.opensAt}
                onChange={set('opensAt')}
              />
            </label>
            <div className={styles.row}>
              <button type="button" className="btn" onClick={saveModule}>
                Сохранить модуль
              </button>
              <button
                type="button"
                className={`${styles.smallBtn} ${styles.danger}`}
                onClick={removeModule}
              >
                Удалить модуль
              </button>
            </div>
          </section>

          <section className={`card ${styles.block}`}>
            <h3 className={styles.blockTitle}>Уроки</h3>
            <p className={styles.hint}>
              Номер задаёт порядок: поставьте уроку 1 — он встанет первым, остальные подвинутся.
              После сохранения номера выстраиваются подряд.
            </p>

            {module.lessons.map((l) => (
              <LessonRow key={l.id} lesson={l} moduleId={moduleId} onChanged={load} />
            ))}

            {addingLesson ? (
              <LessonRow
                lesson={{ order: module.lessons.length + 1 }}
                moduleId={moduleId}
                onChanged={load}
              />
            ) : (
              <button type="button" className={styles.smallBtn} onClick={() => setAddingLesson(true)}>
                + Новый урок
              </button>
            )}
          </section>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminModulePage;
