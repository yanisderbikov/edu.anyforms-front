import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminLayout from './AdminLayout';
import { getAdminCourse, updateCourse, createModule } from '../../api/adminApi';
import styles from './Admin.module.css';

const formatOpensAt = (iso) => {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00`);
  return `откроется ${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`;
};

const lessonsLabel = (count) => {
  const last = count % 10;
  const teen = count % 100 >= 11 && count % 100 <= 14;
  if (!teen && last === 1) return `${count} урок`;
  if (!teen && last >= 2 && last <= 4) return `${count} урока`;
  return `${count} уроков`;
};

/* Превью модуля: кликаем — проваливаемся внутрь и наполняем */
const ModuleCard = ({ module }) => {
  const locked = module.status !== 'open';
  const count = module.lessons?.length ?? 0;

  return (
    <Link to={`/admin/course/${module.id}`} className={styles.moduleCard}>
      <div className={styles.moduleCardHead}>
        <span className={`${styles.num} ${locked ? styles.numLocked : ''}`}>{module.order}</span>
        <h3 className={styles.moduleCardTitle}>{module.title}</h3>
        <span className={styles.badge}>{locked ? 'Закрыт' : 'Открыт'}</span>
      </div>

      <p className={styles.moduleCardDesc}>
        {module.description || <span className={styles.empty}>Описание не заполнено</span>}
      </p>

      <span className={styles.moduleCardMeta}>
        {count === 0 ? <span className={styles.empty}>Уроков пока нет</span> : lessonsLabel(count)}
        {formatOpensAt(module.opensAt) ? ` · ${formatOpensAt(module.opensAt)}` : ''}
        <span className={styles.moduleCardAction}>Редактировать →</span>
      </span>
    </Link>
  );
};

const AdminCoursePage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [courseForm, setCourseForm] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    getAdminCourse()
      .then((d) => {
        setData(d);
        setError('');
        setCourseForm({
          title: d.course.title,
          subtitle: d.course.subtitle ?? '',
          chatLabel: d.support.chatLabel ?? '',
          chatUrl: d.support.chatUrl ?? '',
          supportLabel: d.support.supportLabel ?? '',
          supportUrl: d.support.supportUrl ?? '',
        });
      })
      .catch((e) => setError(`${e.message}. Проверьте, что бэкенд запущен на :8091.`));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setC = (field) => (e) => setCourseForm({ ...courseForm, [field]: e.target.value });

  const saveCourse = async () => {
    try {
      await updateCourse(courseForm);
      toast.success('Шапка курса сохранена');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Создаём модуль с одним названием и сразу проваливаемся внутрь — наполнять
  const addModule = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const { id } = await createModule({
        order: (data?.modules.length ?? 0) + 1,
        title: newTitle.trim(),
        description: null,
        opensAt: null,
      });
      toast.success('Модуль создан');
      navigate(`/admin/course/${id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <AdminLayout>
      <div className={styles.head}>
        <span className="eyebrow eyebrowAccent">Курс</span>
        <h1 className="h2">
          Модули <span className="hAccent">курса</span>
        </h1>
        <p className="lead">
          Кликните по модулю, чтобы наполнить его уроками. Онбординг настраивается отдельно.
        </p>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {!data && !error && <p className={styles.loading}>Загружаем…</p>}

      {data && courseForm && (
        <>
          <section className={`card ${styles.block}`}>
            <h3 className={styles.blockTitle}>Шапка курса</h3>
            <input className="input" placeholder="Название" value={courseForm.title} onChange={setC('title')} />
            <textarea
              className={`input ${styles.textarea}`}
              placeholder="Подзаголовок"
              rows={2}
              value={courseForm.subtitle}
              onChange={setC('subtitle')}
            />
            <div className={styles.row}>
              <input className="input" placeholder="Название чата" value={courseForm.chatLabel} onChange={setC('chatLabel')} />
              <input className="input" placeholder="Ссылка на чат" value={courseForm.chatUrl} onChange={setC('chatUrl')} />
            </div>
            <div className={styles.row}>
              <input className="input" placeholder="Название поддержки" value={courseForm.supportLabel} onChange={setC('supportLabel')} />
              <input className="input" placeholder="Ссылка на поддержку" value={courseForm.supportUrl} onChange={setC('supportUrl')} />
            </div>
            <div className={styles.row}>
              <button type="button" className="btn" onClick={saveCourse}>
                Сохранить шапку
              </button>
            </div>
          </section>

          <div className={styles.moduleList}>
            {data.modules.map((m) => (
              <ModuleCard key={m.id} module={m} />
            ))}
          </div>

          <div className={`${styles.row} ${styles.createRow}`}>
            <input
              className="input"
              placeholder="Название нового модуля"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addModule()}
            />
            <button
              type="button"
              className="btn"
              disabled={creating || !newTitle.trim()}
              onClick={addModule}
            >
              + Добавить модуль
            </button>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminCoursePage;
