import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AdminLayout, { DirectUploadButton } from './AdminLayout';
import { getAdminOnboarding, createSlide, updateSlide, deleteSlide } from '../../api/adminApi';
import styles from './Admin.module.css';

const KINDS = [
  { value: 'TEXT', label: 'Обычный слайд' },
  { value: 'SUPPORT', label: 'Со ссылками на чат и поддержку' },
  { value: 'FINAL', label: 'Последний — кнопка «Поехали!»' },
];

const SlideRow = ({ slide, onChanged }) => {
  const isNew = !slide.id;
  const [form, setForm] = useState({
    order: slide.order ?? 1,
    kind: slide.kind ?? 'TEXT',
    eyebrow: slide.eyebrow ?? '',
    title: slide.title ?? '',
    body: slide.body ?? '',
    points: (slide.points ?? []).join('\n'),
    imageUrl: slide.imageKey ?? '',
  });
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const save = async () => {
    setBusy(true);
    try {
      const payload = {
        order: Number(form.order),
        kind: form.kind,
        eyebrow: form.eyebrow,
        title: form.title,
        body: form.body,
        points: form.points.split('\n').map((s) => s.trim()).filter(Boolean),
        imageUrl: form.imageUrl || null,
      };
      if (isNew) {
        await createSlide(payload);
        toast.success('Слайд создан');
      } else {
        await updateSlide(slide.id, payload);
        toast.success('Слайд сохранён');
      }
      onChanged();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Удалить слайд «${form.title}»?`)) return;
    try {
      await deleteSlide(slide.id);
      toast.success('Слайд удалён');
      onChanged();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <section className={`card ${styles.block}`}>
      <div className={`${styles.row} ${styles.rowBottom}`}>
        <label className={styles.ordLabel}>
          <span className={styles.ordCaption}>Слайд №</span>
          <input
            className={`input ${styles.ordInput}`}
            type="number"
            value={form.order}
            onChange={set('order')}
          />
        </label>
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
      <textarea
        className={`input ${styles.textarea}`}
        placeholder="Подпись под заголовком"
        rows={2}
        value={form.body}
        onChange={set('body')}
      />
      <textarea
        className={`input ${styles.textarea}`}
        placeholder="Пункты со стрелками — по одному на строку"
        rows={3}
        value={form.points}
        onChange={set('points')}
      />

      <div className={styles.row}>
        <input
          className="input"
          placeholder="Картинка: ссылка или ключ в бакете"
          value={form.imageUrl}
          onChange={set('imageUrl')}
        />
        <DirectUploadButton
          prefix="onboarding"
          label="Загрузить фото"
          onUploaded={(key) => setForm((f) => ({ ...f, imageUrl: key }))}
        />
      </div>

      {slide.image && <img className={styles.preview} src={slide.image} alt="" />}

      <div className={styles.row}>
        <button type="button" className="btn" disabled={busy} onClick={save}>
          {isNew ? 'Создать слайд' : 'Сохранить'}
        </button>
        {!isNew && (
          <button type="button" className={`${styles.smallBtn} ${styles.danger}`} onClick={remove}>
            Удалить
          </button>
        )}
      </div>
    </section>
  );
};

const AdminOnboardingPage = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [addingSlide, setAddingSlide] = useState(false);

  const load = useCallback(() => {
    getAdminOnboarding()
      .then((d) => {
        setData(d);
        setError('');
        setAddingSlide(false);
      })
      .catch((e) => setError(`${e.message}. Проверьте, что бэкенд запущен на :8091.`));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

      {error && <p className={styles.error}>{error}</p>}
      {!data && !error && <p className={styles.loading}>Загружаем…</p>}

      {data && (
        <>
          {data.slides.map((s) => (
            <SlideRow key={s.id} slide={s} onChanged={load} />
          ))}

          {addingSlide ? (
            <SlideRow slide={{ order: data.slides.length + 1, kind: 'TEXT' }} onChanged={load} />
          ) : (
            <button type="button" className="btn btnGhost" onClick={() => setAddingSlide(true)}>
              + Новый слайд
            </button>
          )}
        </>
      )}
    </AdminLayout>
  );
};

export default AdminOnboardingPage;
