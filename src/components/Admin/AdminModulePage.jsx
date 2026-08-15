import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import SupportHint, { toastError } from '../shared/SupportHint';
import AdminLayout, { DirectUploadButton } from './AdminLayout';
import AutoTextarea from '../shared/AutoTextarea';
import {
  getAdminCourse,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
} from '../../api/adminApi';
import styles from './Admin.module.css';

/* ── Урок: заголовок, видео, описание. Порядок — стрелками вверх/вниз.
     Пока есть несохранённые правки, строка подсвечена, «Сохранить» — яркая ── */
const LessonRow = ({ lesson, index, count, onChanged }) => {
  const [form, setForm] = useState({
    title: lesson.title ?? '',
    description: lesson.description ?? '',
    videoUrl: lesson.videoKey ?? '',
  });
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  // Есть ли отличия от сохранённого на бэке
  const dirty =
    form.title !== (lesson.title ?? '') ||
    form.description !== (lesson.description ?? '') ||
    form.videoUrl !== (lesson.videoKey ?? '');

  // Текущая позиция урока = index + 1 (бэк держит номера подряд)
  const payload = (order) => ({ ...form, order });

  const save = async () => {
    setBusy(true);
    try {
      await updateLesson(lesson.id, payload(index + 1));
      toast.success('Урок сохранён');
      onChanged();
    } catch (err) {
      toastError(err);
    } finally {
      setBusy(false);
    }
  };

  /* Сдвиг: вверх — на прежнюю позицию соседа сверху; вниз — за соседа снизу.
     «+2» из-за перенумерации на бэке: при равных номерах сохранённый урок
     встаёт первым, поэтому просто «+1» оставил бы его на месте */
  const move = async (dir) => {
    setBusy(true);
    try {
      await updateLesson(lesson.id, payload(dir === 'up' ? index : index + 3));
      onChanged();
    } catch (err) {
      toastError(err);
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
      toastError(err);
    }
  };

  return (
    <div className={`${styles.lesson} ${dirty ? styles.lessonDirty : ''}`}>
      <div className={styles.row}>
        {(
          <span className={styles.moveCol}>
            <button
              type="button"
              className={styles.moveBtn}
              title="Выше"
              disabled={busy || index === 0}
              onClick={() => move('up')}
            >
              ↑
            </button>
            <button
              type="button"
              className={styles.moveBtn}
              title="Ниже"
              disabled={busy || index === count - 1}
              onClick={() => move('down')}
            >
              ↓
            </button>
          </span>
        )}
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

      <AutoTextarea
        className={`input ${styles.textarea}`}
        placeholder="Описание под видео"
        minRows={5}
        value={form.description}
        onChange={set('description')}
      />

      <div className={styles.row}>
        <button
          type="button"
          className={`${styles.smallBtn} ${dirty ? styles.saveDirty : styles.saveIdle}`}
          disabled={busy || !dirty}
          onClick={save}
        >
          Сохранить
        </button>
        <button type="button" className={`${styles.smallBtn} ${styles.danger}`} onClick={remove}>
          Удалить
        </button>
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
  const [creatingLesson, setCreatingLesson] = useState(false);

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
          imageUrl: found.imageKey ?? '',
          opensAt: found.opensAt ?? '',
        });
        setError('');
      })
      .catch((e) => setError(`${e.message}. Проверьте, что бэкенд запущен на :8091.`));
  }, [moduleId]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  // Урок создаётся сразу — дальше строку просто редактируют и сохраняют
  const addLesson = async () => {
    setCreatingLesson(true);
    try {
      await createLesson(moduleId, {
        order: (module?.lessons.length ?? 0) + 1,
        title: '',
        description: null,
        videoUrl: null,
      });
      toast.success('Урок добавлен');
      load();
    } catch (err) {
      toastError(err);
    } finally {
      setCreatingLesson(false);
    }
  };

  const removeModule = async () => {
    if (!window.confirm(`Удалить модуль «${form.title}» вместе с уроками?`)) return;
    try {
      await deleteModule(moduleId);
      toast.success('Модуль удалён');
      navigate('/admin/course', { replace: true });
    } catch (err) {
      toastError(err);
    }
  };

  const saveModule = async () => {
    try {
      await updateModule(moduleId, {
        order: Number(form.order),
        title: form.title,
        description: form.description,
        imageUrl: form.imageUrl || null,
        opensAt: form.opensAt || null,
      });
      toast.success('Модуль сохранён');
      load();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <AdminLayout>
      <Link to="/admin/course" className={styles.backLink}>
        ← Все модули
      </Link>

      {error && (
        <p className={styles.error}>
          <SupportHint>{error}</SupportHint>
        </p>
      )}
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
            <AutoTextarea
              className={`input ${styles.textarea}`}
              placeholder="Описание"
              minRows={5}
              value={form.description}
              onChange={set('description')}
            />
            <div className={styles.row}>
              <input
                className="input"
                placeholder="Картинка карточки 16:9 — ссылка или ключ в бакете"
                value={form.imageUrl}
                onChange={set('imageUrl')}
              />
              <DirectUploadButton
                prefix="modules"
                label="Загрузить фото"
                onUploaded={(key) => setForm((f) => ({ ...f, imageUrl: key }))}
              />
            </div>
            {module.image && <img className={styles.preview} src={module.image} alt="" />}
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

            {module.lessons.map((l, i) => (
              <LessonRow
                key={l.id}
                lesson={l}
                index={i}
                count={module.lessons.length}
                onChanged={load}
              />
            ))}
            <button
              type="button"
              className={styles.smallBtn}
              disabled={creatingLesson}
              onClick={addLesson}
            >
              {creatingLesson ? 'Создаём…' : '+ Новый урок'}
            </button>
          </section>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminModulePage;
