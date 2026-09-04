import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import KinescopePlayer from '@kinescope/react-kinescope-player';
import SupportHint, { toastError } from '../shared/SupportHint';
import AdminLayout, { DirectUploadButton, KinescopeUploadButton } from './AdminLayout';
import AutoTextarea from '../shared/AutoTextarea';
import {
  getAdminCourse,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
  createLessonFile,
  deleteLessonFile,
  createModuleFile,
  deleteModuleFile,
} from '../../api/adminApi';
import { fetchVideoToken } from '../../api/courseApi';
import { formatFileSize } from '../../shared/format';
import { parseKinescope } from '../../shared/kinescope';
import styles from './Admin.module.css';

/* ── Файлы-материалы урока или модуля. Прикрепляются и удаляются сразу,
     без кнопки «Сохранить»: сам файл к этому моменту уже лежит в S3 ── */
const FilesBlock = ({ caption, files, doneMessage, onAttach, onRemove }) => (
  <div className={styles.filesBlock}>
    <span className={styles.filesCaption}>{caption}</span>
    {(files ?? []).map((f) => (
      <div key={f.id} className={styles.fileRow}>
        <a className={styles.fileName} href={f.url} target="_blank" rel="noreferrer">
          {f.name}
        </a>
        {f.sizeBytes != null && <span className={styles.fileSize}>{formatFileSize(f.sizeBytes)}</span>}
        <button
          type="button"
          className={`${styles.smallBtn} ${styles.danger}`}
          onClick={() => onRemove(f)}
        >
          Удалить
        </button>
      </div>
    ))}
    <DirectUploadButton
      prefix="files"
      label="+ Прикрепить файл"
      doneMessage={doneMessage}
      onUploaded={onAttach}
    />
  </div>
);

/* ── Урок: заголовок, видео, обложка, описание. Порядок — стрелками вверх/вниз.
     Пока есть несохранённые правки, строка подсвечена, «Сохранить» — яркая ── */
const LessonRow = ({ lesson, index, count, onChanged, videoToken }) => {
  const [ratio, setRatio] = useState(null); // реальные пропорции видео из плеера
  const [form, setForm] = useState({
    title: lesson.title ?? '',
    description: lesson.description ?? '',
    videoUrl: lesson.videoKey ?? '',
    coverUrl: lesson.coverKey ?? '',
  });
  const [busy, setBusy] = useState(false);
  // Локальное превью только что загруженной обложки — видно ещё до сохранения
  const [coverPreview, setCoverPreview] = useState(null);

  const showCoverPreview = (file) =>
    setCoverPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });

  /* Что показывать: свежезагруженный файл; иначе, пока ключ в поле не менялся,
     подписанную ссылку с бэка; пустое поле — обложки нет */
  const coverSrc = coverPreview ?? (form.coverUrl ? lesson.cover : null);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  /* Превью: у Kinescope ссылка сама играбельная, у старых видео из бакета
     подписанный URL приходит с бэка — он валиден, пока поле не трогали */
  const kinescope = parseKinescope(form.videoUrl);
  const legacyVideo =
    !kinescope && form.videoUrl && form.videoUrl === (lesson.videoKey ?? '')
      ? lesson.videoUrl
      : null;

  // Есть ли отличия от сохранённого на бэке
  const dirty =
    form.title !== (lesson.title ?? '') ||
    form.description !== (lesson.description ?? '') ||
    form.videoUrl !== (lesson.videoKey ?? '') ||
    form.coverUrl !== (lesson.coverKey ?? '');

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

  /* Файлы, в отличие от полей урока, сохраняются сразу — без кнопки «Сохранить» */
  const attachFile = async (key, file) => {
    await createLessonFile(lesson.id, {
      name: file.name,
      fileUrl: key,
      sizeBytes: file.size,
    });
    onChanged();
  };

  const removeFile = async (file) => {
    if (!window.confirm(`Удалить файл «${file.name}»?`)) return;
    try {
      await deleteLessonFile(file.id);
      toast.success('Файл удалён');
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

      <div className={styles.mediaBlock}>
        <span className={styles.filesCaption}>Видео урока</span>
        {kinescope ? (
          <div
            className={styles.videoPreview}
            style={{ '--preview-ar': ratio ?? kinescope.aspectRatio }}
          >
            <KinescopePlayer
              key={kinescope.videoId}
              videoId={kinescope.videoId}
              drmAuthToken={videoToken || undefined}
              onSizeChanged={({ width, height }) => {
                if (width > 0 && height > 0) setRatio(width / height);
              }}
            />
          </div>
        ) : legacyVideo ? (
          /* Старое видео из бакета: играет, пока его не заменили на Kinescope */
          <video className={styles.videoPreview} src={legacyVideo} controls preload="metadata" />
        ) : (
          <p className={styles.hint}>
            {form.videoUrl
              ? 'Видео загружено — превью появится после сохранения'
              : 'Видео пока нет'}
          </p>
        )}
        <KinescopeUploadButton
          label={form.videoUrl ? 'Заменить видео' : 'Загрузить видео'}
          onUploaded={(embedUrl) => setForm((f) => ({ ...f, videoUrl: embedUrl }))}
        />
      </div>

      <div className={styles.mediaBlock}>
        <span className={styles.filesCaption}>Обложка 16:9 — превью до запуска</span>
        {coverSrc ? (
          <img className={styles.preview} src={coverSrc} alt="" />
        ) : (
          <p className={styles.hint}>Обложки пока нет</p>
        )}
        <DirectUploadButton
          prefix="lessons"
          label={form.coverUrl ? 'Заменить обложку' : 'Загрузить обложку'}
          onUploaded={(key, file) => {
            showCoverPreview(file);
            setForm((f) => ({ ...f, coverUrl: key }));
          }}
        />
      </div>

      <AutoTextarea
        className={`input ${styles.textarea}`}
        placeholder="Описание под видео"
        minRows={5}
        value={form.description}
        onChange={set('description')}
      />

      <FilesBlock
        caption="Файлы урока — студент сможет их скачать; прикрепляются и удаляются сразу"
        files={lesson.files}
        doneMessage="Файл прикреплён к уроку"
        onAttach={attachFile}
        onRemove={removeFile}
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
  const [videoToken, setVideoToken] = useState(null);
  const [moduleRatio, setModuleRatio] = useState(null); // пропорции видео модуля из плеера
  // Локальные превью только что загруженных картинок — видны ещё до сохранения
  const [previews, setPreviews] = useState({ image: null, cover: null, videoCover: null });

  const showPreview = (field, file) =>
    setPreviews((p) => {
      if (p[field]) URL.revokeObjectURL(p[field]);
      return { ...p, [field]: URL.createObjectURL(file) };
    });

  /* keepForm — обновить только данные с бэка (например, список файлов),
     не затирая несохранённые правки в полях модуля */
  const load = useCallback(
    ({ keepForm = false } = {}) => {
      getAdminCourse()
        .then((d) => {
          const found = d.modules.find((m) => m.id === moduleId);
          if (!found) {
            setError('Модуль не найден');
            return;
          }
          setModule(found);
          if (!keepForm) {
            const [opensDate = '', opensTime = ''] = (found.opensAt ?? '').split('T');
            setForm({
              order: found.order,
              title: found.title,
              description: found.description ?? '',
              videoDescription: found.videoDescription ?? '',
              imageUrl: found.imageKey ?? '',
              coverUrl: found.coverKey ?? '',
              videoUrl: found.videoKey ?? '',
              videoCoverUrl: found.videoCoverKey ?? '',
              opensDate,
              opensTime,
            });
          }
          setError('');
        })
        .catch((e) => setError(`${e.message}. Проверьте, что бэкенд запущен на :8091.`));
    },
    [moduleId]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Без токена превью не заиграет, когда у Kinescope включена строгая авторизация
  useEffect(() => {
    fetchVideoToken()
      .then(setVideoToken)
      .catch(() => {});
  }, []);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  // «2026-09-01» + «14:00» → «2026-09-01T14:00»: формат opensAt в API (московское
  // время). Дата без времени = полночь, время без даты модуль не закрывает
  const opensAt = form?.opensDate ? `${form.opensDate}T${form.opensTime || '00:00'}` : null;

  // Есть ли отличия от сохранённого на бэке — как у уроков
  const dirty =
    !!form &&
    !!module &&
    (Number(form.order) !== module.order ||
      form.title !== (module.title ?? '') ||
      form.description !== (module.description ?? '') ||
      form.videoDescription !== (module.videoDescription ?? '') ||
      form.imageUrl !== (module.imageKey ?? '') ||
      form.coverUrl !== (module.coverKey ?? '') ||
      form.videoUrl !== (module.videoKey ?? '') ||
      form.videoCoverUrl !== (module.videoCoverKey ?? '') ||
      (opensAt ?? '') !== (module.opensAt ?? ''));

  // Урок создаётся сразу — дальше строку просто редактируют и сохраняют
  const addLesson = async () => {
    setCreatingLesson(true);
    try {
      await createLesson(moduleId, {
        order: (module?.lessons.length ?? 0) + 1,
        title: '',
        description: null,
        videoUrl: null,
        coverUrl: null,
      });
      toast.success('Урок добавлен');
      load();
    } catch (err) {
      toastError(err);
    } finally {
      setCreatingLesson(false);
    }
  };

  /* Файлы модуля, как у урока, сохраняются сразу. Форму при этом не трогаем —
     набранный, но не сохранённый текст должен пережить загрузку файла */
  const attachModuleFile = async (key, file) => {
    await createModuleFile(moduleId, {
      name: file.name,
      fileUrl: key,
      sizeBytes: file.size,
    });
    load({ keepForm: true });
  };

  const removeModuleFile = async (file) => {
    if (!window.confirm(`Удалить файл «${file.name}»?`)) return;
    try {
      await deleteModuleFile(file.id);
      toast.success('Файл удалён');
      load({ keepForm: true });
    } catch (err) {
      toastError(err);
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
        videoDescription: form.videoDescription,
        imageUrl: form.imageUrl || null,
        coverUrl: form.coverUrl || null,
        videoUrl: form.videoUrl || null,
        videoCoverUrl: form.videoCoverUrl || null,
        opensAt,
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
            {/* Медиа и тексты модуля, сгруппировано по месту показа:
                у карточки на главной и у страницы модуля описания разные */}
            <div className={styles.mediaGroup}>
              <div className={styles.mediaGroupHead}>
                <span className={styles.mediaGroupTitle}>Главный экран курса</span>
                <span className={styles.hint}>Картинка и описание карточки модуля в списке модулей</span>
              </div>
              <div className={styles.mediaBlock}>
                <span className={styles.filesCaption}>Описание в карточке</span>
                <AutoTextarea
                  className={`input ${styles.textarea}`}
                  placeholder="Коротко, о чём модуль"
                  minRows={3}
                  value={form.description}
                  onChange={set('description')}
                />
              </div>
              <div className={styles.mediaBlock}>
                <span className={styles.filesCaption}>Превью карточки 16:9</span>
                {(previews.image ?? (form.imageUrl ? module.image : null)) ? (
                  <img
                    className={styles.preview}
                    src={previews.image ?? module.image}
                    alt=""
                  />
                ) : (
                  <p className={styles.hint}>Картинки пока нет</p>
                )}
                <DirectUploadButton
                  prefix="modules"
                  label={form.imageUrl ? 'Заменить фото' : 'Загрузить фото'}
                  onUploaded={(key, file) => {
                    showPreview('image', file);
                    setForm((f) => ({ ...f, imageUrl: key }));
                  }}
                />
              </div>
            </div>

            <div className={styles.mediaGroup}>
              <div className={styles.mediaGroupHead}>
                <span className={styles.mediaGroupTitle}>Страница модуля</span>
                <span className={styles.hint}>
                  Сверху обложка-баннер во всю ширину, ниже — заголовок, видео, описание и файлы
                </span>
              </div>

              <div className={styles.mediaBlock}>
                <span className={styles.filesCaption}>Обложка — широкий баннер вверху</span>
                {(previews.cover ?? (form.coverUrl ? module.cover : null)) ? (
                  <img
                    className={styles.coverPreview}
                    src={previews.cover ?? module.cover}
                    alt=""
                  />
                ) : (
                  <p className={styles.hint}>Обложки пока нет</p>
                )}
                <div className={styles.row}>
                  <DirectUploadButton
                    prefix="modules"
                    label={form.coverUrl ? 'Заменить обложку' : 'Загрузить обложку'}
                    onUploaded={(key, file) => {
                      showPreview('cover', file);
                      setForm((f) => ({ ...f, coverUrl: key }));
                    }}
                  />
                  {form.coverUrl && (
                    <button
                      type="button"
                      className={`${styles.smallBtn} ${styles.danger}`}
                      onClick={() => {
                        setPreviews((p) => {
                          if (p.cover) URL.revokeObjectURL(p.cover);
                          return { ...p, cover: null };
                        });
                        setForm((f) => ({ ...f, coverUrl: '' }));
                      }}
                    >
                      Убрать обложку
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.mediaBlock}>
                <span className={styles.filesCaption}>Видео — между заголовком и описанием</span>
                {(() => {
                  const kinescope = parseKinescope(form.videoUrl);
                  /* У старых видео из бакета играбельна только подписанная ссылка
                     с бэка — она валидна, пока поле не трогали */
                  const legacyVideo =
                    !kinescope && form.videoUrl && form.videoUrl === (module.videoKey ?? '')
                      ? module.videoUrl
                      : null;
                  if (kinescope) {
                    return (
                      <div
                        className={styles.videoPreview}
                        style={{ '--preview-ar': moduleRatio ?? kinescope.aspectRatio }}
                      >
                        <KinescopePlayer
                          key={kinescope.videoId}
                          videoId={kinescope.videoId}
                          drmAuthToken={videoToken || undefined}
                          onSizeChanged={({ width, height }) => {
                            if (width > 0 && height > 0) setModuleRatio(width / height);
                          }}
                        />
                      </div>
                    );
                  }
                  if (legacyVideo) {
                    return (
                      <video
                        className={styles.videoPreview}
                        src={legacyVideo}
                        controls
                        preload="metadata"
                      />
                    );
                  }
                  return (
                    <p className={styles.hint}>
                      {form.videoUrl
                        ? 'Видео загружено — превью появится после сохранения'
                        : 'Видео пока нет'}
                    </p>
                  );
                })()}
                <div className={styles.row}>
                  <KinescopeUploadButton
                    label={form.videoUrl ? 'Заменить видео' : 'Загрузить видео'}
                    onUploaded={(embedUrl) => setForm((f) => ({ ...f, videoUrl: embedUrl }))}
                  />
                  {form.videoUrl && (
                    <button
                      type="button"
                      className={`${styles.smallBtn} ${styles.danger}`}
                      onClick={() => setForm((f) => ({ ...f, videoUrl: '' }))}
                    >
                      Убрать видео
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.mediaBlock}>
                <span className={styles.filesCaption}>
                  Обложка видео 16:9 — постер до запуска
                </span>
                {(previews.videoCover ?? (form.videoCoverUrl ? module.videoCover : null)) ? (
                  <img
                    className={styles.preview}
                    src={previews.videoCover ?? module.videoCover}
                    alt=""
                  />
                ) : (
                  <p className={styles.hint}>Обложки пока нет</p>
                )}
                <div className={styles.row}>
                  <DirectUploadButton
                    prefix="modules"
                    label={form.videoCoverUrl ? 'Заменить обложку' : 'Загрузить обложку'}
                    onUploaded={(key, file) => {
                      showPreview('videoCover', file);
                      setForm((f) => ({ ...f, videoCoverUrl: key }));
                    }}
                  />
                  {form.videoCoverUrl && (
                    <button
                      type="button"
                      className={`${styles.smallBtn} ${styles.danger}`}
                      onClick={() => {
                        setPreviews((p) => {
                          if (p.videoCover) URL.revokeObjectURL(p.videoCover);
                          return { ...p, videoCover: null };
                        });
                        setForm((f) => ({ ...f, videoCoverUrl: '' }));
                      }}
                    >
                      Убрать обложку
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.mediaBlock}>
                <span className={styles.filesCaption}>Описание под видео</span>
                <AutoTextarea
                  className={`input ${styles.textarea}`}
                  placeholder="Подробно, что ждёт в модуле"
                  minRows={5}
                  value={form.videoDescription}
                  onChange={set('videoDescription')}
                />
              </div>

              <FilesBlock
                caption="Файлы модуля — под описанием, студент сможет их скачать; прикрепляются и удаляются сразу"
                files={module.files}
                doneMessage="Файл прикреплён к модулю"
                onAttach={attachModuleFile}
                onRemove={removeModuleFile}
              />
            </div>
            <div className={styles.row}>
              <label className={styles.dateLabel}>
                Дата открытия (пусто = открыт сразу)
                <input
                  className={`input ${styles.dateInput}`}
                  type="date"
                  value={form.opensDate}
                  onChange={set('opensDate')}
                />
              </label>
              <label className={styles.dateLabel}>
                Время открытия (МСК)
                <input
                  className={`input ${styles.timeInput}`}
                  type="time"
                  value={form.opensTime}
                  onChange={set('opensTime')}
                />
              </label>
            </div>
            <div className={styles.row}>
              <button
                type="button"
                className={`${styles.smallBtn} ${dirty ? styles.saveDirty : styles.saveIdle}`}
                disabled={!dirty}
                onClick={saveModule}
              >
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
                videoToken={videoToken}
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
