import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import SupportHint, { toastError } from '../shared/SupportHint';
import AdminLayout, { DirectUploadButton } from './AdminLayout';
import AutoTextarea from '../shared/AutoTextarea';
import { getAdminOnboarding, createSlide, updateSlide, deleteSlide } from '../../api/adminApi';
import styles from './Admin.module.css';

const KINDS = [
  { value: 'TEXT', label: 'Обычный слайд' },
  { value: 'SUPPORT', label: 'Со ссылками на чат и поддержку' },
  { value: 'FINAL', label: 'Последний — кнопка «Поехали!»' },
];

/* Слайд: порядок — стрелками вверх/вниз. Пока есть несохранённые правки,
   карточка подсвечена, «Сохранить» — яркая */
const SlideRow = ({ slide, index, count, onChanged }) => {
  const savedPoints = (slide.points ?? []).join('\n');
  const [form, setForm] = useState({
    kind: slide.kind ?? 'TEXT',
    eyebrow: slide.eyebrow ?? '',
    title: slide.title ?? '',
    body: slide.body ?? '',
    points: savedPoints,
    imageUrl: slide.imageKey ?? '',
  });
  const [busy, setBusy] = useState(false);
  // Локальное превью только что загруженной картинки — видно ещё до сохранения
  const [imagePreview, setImagePreview] = useState(null);

  const showImagePreview = (file) =>
    setImagePreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });

  /* Что показывать: свежезагруженный файл; иначе, пока ключ не менялся,
     подписанную ссылку с бэка; пустое поле — картинки нет */
  const imageSrc = imagePreview ?? (form.imageUrl ? slide.image : null);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  // Есть ли отличия от сохранённого на бэке
  const dirty =
    form.kind !== (slide.kind ?? 'TEXT') ||
    form.eyebrow !== (slide.eyebrow ?? '') ||
    form.title !== (slide.title ?? '') ||
    form.body !== (slide.body ?? '') ||
    form.points !== savedPoints ||
    form.imageUrl !== (slide.imageKey ?? '');

  const payload = (order) => ({
    order,
    kind: form.kind,
    eyebrow: form.eyebrow,
    title: form.title,
    body: form.body,
    points: form.points.split('\n').map((s) => s.trim()).filter(Boolean),
    imageUrl: form.imageUrl || null,
  });

  const save = async () => {
    setBusy(true);
    try {
      await updateSlide(slide.id, payload(index + 1));
      toast.success('Слайд сохранён');
      onChanged();
    } catch (err) {
      toastError(err);
    } finally {
      setBusy(false);
    }
  };

  /* Сдвиг: вверх — на прежнюю позицию соседа сверху; вниз — за соседа снизу.
     «+3» из-за перенумерации на бэке: при равных номерах сохранённый слайд
     встаёт первым, поэтому просто «+1» оставил бы его на месте */
  const move = async (dir) => {
    setBusy(true);
    try {
      await updateSlide(slide.id, payload(dir === 'up' ? index : index + 3));
      onChanged();
    } catch (err) {
      toastError(err);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Удалить слайд «${form.title || 'без заголовка'}»?`)) return;
    try {
      await deleteSlide(slide.id);
      toast.success('Слайд удалён');
      onChanged();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <section className={`card ${styles.block} ${dirty ? styles.lessonDirty : ''}`}>
      <div className={styles.row}>
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
        <select className={`input ${styles.select}`} value={form.kind} onChange={set('kind')}>
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </div>

      <input
        className="input"
        placeholder="Надпись сверху («Модуль 1», «Добро пожаловать»)"
        value={form.eyebrow}
        onChange={set('eyebrow')}
      />
      <input
        className="input"
        placeholder="Заголовок — слово в {фигурных скобках} станет голубым"
        value={form.title}
        onChange={set('title')}
      />
      <AutoTextarea
        className={`input ${styles.textarea}`}
        placeholder="Подпись под заголовком"
        minRows={2}
        value={form.body}
        onChange={set('body')}
      />
      <AutoTextarea
        className={`input ${styles.textarea}`}
        placeholder="Пункты со стрелками — по одному на строку"
        minRows={3}
        value={form.points}
        onChange={set('points')}
      />

      <div className={styles.mediaBlock}>
        <span className={styles.filesCaption}>Картинка слайда</span>
        {imageSrc ? (
          <img className={styles.preview} src={imageSrc} alt="" />
        ) : (
          <p className={styles.hint}>Картинки пока нет</p>
        )}
        <div className={styles.row}>
          <DirectUploadButton
            prefix="onboarding"
            label={form.imageUrl ? 'Заменить фото' : 'Загрузить фото'}
            onUploaded={(key, file) => {
              showImagePreview(file);
              setForm((f) => ({ ...f, imageUrl: key }));
            }}
          />
          {form.imageUrl && (
            <button
              type="button"
              className={`${styles.smallBtn} ${styles.danger}`}
              onClick={() => {
                setImagePreview((old) => {
                  if (old) URL.revokeObjectURL(old);
                  return null;
                });
                setForm((f) => ({ ...f, imageUrl: '' }));
              }}
            >
              Убрать фото
            </button>
          )}
        </div>
      </div>

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
    </section>
  );
};

const AdminOnboardingPage = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [creatingSlide, setCreatingSlide] = useState(false);

  const load = useCallback(() => {
    getAdminOnboarding()
      .then((d) => {
        setData(d);
        setError('');
      })
      .catch((e) => setError(`${e.message}. Проверьте, что бэкенд запущен на :8091.`));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Слайд создаётся сразу — дальше карточку просто редактируют и сохраняют
  const addSlide = async () => {
    setCreatingSlide(true);
    try {
      await createSlide({
        order: (data?.slides.length ?? 0) + 1,
        kind: 'TEXT',
        eyebrow: null,
        title: '',
        body: null,
        points: [],
        imageUrl: null,
      });
      toast.success('Слайд добавлен');
      load();
    } catch (err) {
      toastError(err);
    } finally {
      setCreatingSlide(false);
    }
  };

  return (
    <AdminLayout>
      <div className={styles.head}>
        <span className="eyebrow eyebrowAccent">Онбординг</span>
        <h1 className="h2">
          Слайды <span className="hAccent">знакомства</span>
        </h1>
        <p className="lead">
          То, что видит студент сразу после первого входа. С модулями курса не связано —
          добавляйте столько слайдов, сколько нужно.
        </p>
      </div>

      {error && (
        <p className={styles.error}>
          <SupportHint>{error}</SupportHint>
        </p>
      )}
      {!data && !error && <p className={styles.loading}>Загружаем…</p>}

      {data && (
        <>
          {data.slides.map((s, i) => (
            <SlideRow
              key={s.id}
              slide={s}
              index={i}
              count={data.slides.length}
              onChanged={load}
            />
          ))}

          <button
            type="button"
            className="btn btnGhost"
            disabled={creatingSlide}
            onClick={addSlide}
          >
            {creatingSlide ? 'Создаём…' : '+ Новый слайд'}
          </button>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminOnboardingPage;
