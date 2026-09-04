import React, { useCallback, useEffect, useMemo, useState } from 'react';
import SupportHint from '../shared/SupportHint';
import AdminLayout from './AdminLayout';
import { getAnalytics } from '../../api/adminApi';
import { daysSince, formatDate, formatDateTime, formatRelative, plural } from '../../shared/format';
import styles from './Admin.module.css';

const PLAN_LABELS = { SELF: 'Общий', PERSONAL: 'Персональный' };

/* Ступени воронки по порядку — от «не пришёл» до «прошёл всё».
   Порядок в массиве = ранг для сортировки и порядок плиток сверху. */
const STAGES = [
  { kind: 'NEVER_SEEN', tile: 'Ни разу не входили', label: () => 'Нет входов' },
  { kind: 'ONBOARDING', tile: 'Не прошли онбординг', label: () => 'Онбординг не пройден' },
  {
    kind: 'NOT_OPENED',
    tile: 'Не открыли модуль',
    label: (s) => `Модуль ${s.moduleOrder} не открыт`,
  },
  {
    kind: 'OPENED',
    tile: 'Открыли, не начали',
    label: (s) => `Модуль ${s.moduleOrder} открыт, не начат`,
  },
  {
    kind: 'STARTED',
    tile: 'Начали, не досмотрели',
    label: (s) => `Модуль ${s.moduleOrder} начат, ничего не досмотрено`,
  },
  { kind: 'IN_PROGRESS', tile: 'В процессе', label: (s) => `Модуль ${s.moduleOrder} в процессе` },
  { kind: 'WAITING_NEXT', tile: 'Ждут следующий модуль', label: () => 'Всё открытое пройдено' },
  { kind: 'COMPLETED', tile: 'Прошли весь курс', label: () => 'Курс пройден' },
];
const STAGE_RANK = Object.fromEntries(STAGES.map((s, i) => [s.kind, i]));
const FINISHED = new Set(['WAITING_NEXT', 'COMPLETED']);

const STATE_RANK = { LOCKED: 0, NOT_OPENED: 1, OPENED: 2, STARTED: 3, IN_PROGRESS: 4, DONE: 5 };
const STATE_LABELS = {
  LOCKED: 'ещё закрыт',
  NOT_OPENED: 'не открывали',
  OPENED: 'открыли, не начали',
  STARTED: 'начали, не досмотрели',
  IN_PROGRESS: 'в процессе',
  DONE: 'пройден',
};
const STATE_CLASS = {
  LOCKED: styles.stLocked,
  NOT_OPENED: styles.stNotOpened,
  OPENED: styles.stOpened,
  STARTED: styles.stStarted,
  IN_PROGRESS: styles.stInProgress,
  DONE: styles.stDone,
};

const stageLabel = (stage) => {
  const def = STAGES.find((s) => s.kind === stage.kind);
  return def ? def.label(stage) : stage.kind;
};
const stageRank = (stage) => STAGE_RANK[stage.kind] * 100 + (stage.moduleOrder ?? 0);
const time = (iso) => (iso ? new Date(iso).getTime() : null);
const idle = (r, now) => daysSince(r.lastActivityAt, now) ?? Infinity;

/* Быстрые фильтры — ответы на вопросы «кто застрял и где».
   ctx.orderIndex: номер модуля → индекс колонки, ctx.now — момент загрузки */
const QUICK = [
  { id: 'all', label: 'Все', test: () => true },
  { id: 'noLesson', label: 'Не начали ни одного урока', test: (r) => r.lessonsStarted === 0 },
  {
    id: 'notNext',
    label: 'Прошли модуль, следующий не начали',
    test: (r, ctx) => {
      if (r.stage.kind !== 'NOT_OPENED' && r.stage.kind !== 'OPENED') return false;
      const idx = ctx.orderIndex[r.stage.moduleOrder];
      return idx > 0 && r.modules.slice(0, idx).some((c) => c.state === 'DONE');
    },
  },
  {
    id: 'stuck7',
    label: 'Застряли: 7+ дней тишины',
    test: (r, ctx) =>
      r.stage.kind !== 'NEVER_SEEN' && !FINISHED.has(r.stage.kind) && idle(r, ctx.now) >= 7,
  },
  { id: 'idle14', label: 'Неактивны 14+ дней', test: (r, ctx) => idle(r, ctx.now) >= 14 },
];

/* Значение для сортировки по колонке. module:N — индекс колонки модуля */
const sortValue = (r, key) => {
  switch (key) {
    case 'email':
      return r.email;
    case 'stage':
      return stageRank(r.stage);
    case 'activity':
      return time(r.lastActivityAt) ?? -1;
    case 'progress':
      return r.lessonsAvailable ? r.lessonsDone / r.lessonsAvailable : 0;
    case 'created':
      return time(r.createdAt) ?? 0;
    default: {
      const cell = r.modules[Number(key.slice('module:'.length))];
      return cell ? cell.lessonsDone * 1000 + cell.lessonsStarted * 10 + STATE_RANK[cell.state] : -1;
    }
  }
};

/* Направление по умолчанию при первом клике: где «больше» интереснее — вниз */
const DEFAULT_DIR = { email: 'asc', stage: 'asc', activity: 'desc', progress: 'desc', created: 'desc' };

const AdminAnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [quick, setQuick] = useState('all');
  const [stageKind, setStageKind] = useState(null); // плитка воронки
  const [moduleIdx, setModuleIdx] = useState(''); // '' = любой модуль
  const [moduleState, setModuleState] = useState(''); // '' = любое состояние
  const [showInactive, setShowInactive] = useState(false);
  const [sort, setSort] = useState({ key: 'stage', dir: 'asc' });
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    getAnalytics()
      .then((d) => {
        setData(d);
        setError('');
      })
      .catch((e) => setError(`${e.message}. Проверьте, что бэкенд запущен на :8091.`))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Один момент «сейчас» на выборку: относительные даты и фильтры по дням считаются от него
  const now = useMemo(() => Date.now(), [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const ctx = useMemo(
    () => ({
      now,
      orderIndex: Object.fromEntries((data?.modules ?? []).map((m, i) => [m.order, i])),
    }),
    [data, now]
  );

  // Отключённые аккаунты — уже не клиенты: прячем, воронку считаем по видимым
  const base = useMemo(
    () => (data ? data.students.filter((r) => showInactive || r.active) : []),
    [data, showInactive]
  );

  const funnel = useMemo(() => {
    const counts = Object.fromEntries(STAGES.map((s) => [s.kind, 0]));
    base.forEach((r) => {
      counts[r.stage.kind] += 1;
    });
    return counts;
  }, [base]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const quickDef = QUICK.find((f) => f.id === quick) ?? QUICK[0];
    const list = base.filter((r) => {
      if (q && !r.email.toLowerCase().includes(q)) return false;
      if (stageKind && r.stage.kind !== stageKind) return false;
      if (!quickDef.test(r, ctx)) return false;
      if (moduleIdx !== '') {
        const cell = r.modules[Number(moduleIdx)];
        if (!cell) return false;
        if (moduleState && cell.state !== moduleState) return false;
      }
      return true;
    });
    const dir = sort.dir === 'asc' ? 1 : -1;
    return list.sort((a, b) => {
      const va = sortValue(a, sort.key);
      const vb = sortValue(b, sort.key);
      const primary = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
      if (primary !== 0) return primary * dir;
      // При равенстве — кто активнее, тот выше; потом по email, чтобы порядок не прыгал
      const byActivity = (time(b.lastActivityAt) ?? -1) - (time(a.lastActivityAt) ?? -1);
      return byActivity !== 0 ? byActivity : a.email.localeCompare(b.email);
    });
  }, [base, query, quick, stageKind, moduleIdx, moduleState, sort, ctx]);

  const toggleSort = (key) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: DEFAULT_DIR[key] ?? 'desc' }
    );

  const filtersActive =
    query.trim() !== '' || quick !== 'all' || stageKind !== null || moduleIdx !== '' || showInactive;

  const resetFilters = () => {
    setQuery('');
    setQuick('all');
    setStageKind(null);
    setModuleIdx('');
    setModuleState('');
    setShowInactive(false);
  };

  /* Выгружаем то, что сейчас на экране: с теми же фильтрами и в том же порядке */
  const exportCsv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = [
      'Email',
      'Формат',
      'Доступ',
      'Ступень',
      'Последняя активность',
      'Первый вход',
      'Онбординг',
      'Досмотрено уроков',
      'Доступно уроков',
      ...data.modules.map((m) => `Модуль ${m.order}: ${m.title}`),
    ];
    const lines = rows.map((r) => [
      r.email,
      PLAN_LABELS[r.plan] ?? r.plan ?? '',
      r.active ? 'активен' : 'отключён',
      stageLabel(r.stage),
      formatDateTime(r.lastActivityAt),
      formatDateTime(r.firstSeenAt),
      formatDateTime(r.onboardingDoneAt),
      r.lessonsDone,
      r.lessonsAvailable,
      ...r.modules.map((c) =>
        c.state === 'LOCKED' ? 'закрыт' : `${c.lessonsDone}/${c.lessonsCount} (${STATE_LABELS[c.state]})`
      ),
    ]);
    // BOM и «;» — чтобы Excel в русской локали открыл файл без танцев с импортом
    const csv = `\ufeff${[head, ...lines].map((l) => l.map(esc).join(';')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderSortHeader = (key, label, title) => {
    const active = sort.key === key;
    return (
      <th key={key} title={title}>
        <button
          type="button"
          className={`${styles.anSortBtn} ${active ? styles.anSortActive : ''}`}
          onClick={() => toggleSort(key)}
        >
          {label}
          {active && <span aria-hidden="true">{sort.dir === 'asc' ? '↑' : '↓'}</span>}
        </button>
      </th>
    );
  };

  const renderCell = (cell, module) => {
    if (cell.state === 'LOCKED') {
      return (
        <span className={`${styles.anPill} ${styles.stLocked}`} title="Модуль ещё не открылся">
          —
        </span>
      );
    }
    const inProgress = cell.lessonsStarted - cell.lessonsDone;
    let text = '—';
    if (cell.lessonsCount > 0) text = `${cell.lessonsDone}/${cell.lessonsCount}`;
    else if (cell.visits > 0) text = 'открыт';
    const title = [
      `${module.title}: ${STATE_LABELS[cell.state]}`,
      cell.visits > 0
        ? `заходов ${cell.visits}, последний ${formatDateTime(cell.lastVisitedAt)}`
        : 'страницу модуля не открывали',
      cell.lessonsStarted > 0
        ? `начато уроков ${cell.lessonsStarted}, досмотрено ${cell.lessonsDone}`
        : null,
    ]
      .filter(Boolean)
      .join('\n');
    return (
      <span className={`${styles.anPill} ${STATE_CLASS[cell.state]}`} title={title}>
        {text}
        {inProgress > 0 && <small title={`ещё ${inProgress} в процессе`}>+{inProgress}</small>}
      </span>
    );
  };

  const renderDetails = (r) => (
    <div className={styles.anDetailsGrid}>
      <div className={styles.anDetailsRow}>
        <span>Доступ выдан: {formatDate(r.createdAt)}</span>
        <span>Первый вход: {formatDateTime(r.firstSeenAt) || 'не было'}</span>
        <span>Последний запрос: {formatDateTime(r.lastSeenAt) || 'не было'}</span>
        <span>Онбординг: {formatDateTime(r.onboardingDoneAt) || 'не пройден'}</span>
      </div>
      {r.modules.map((cell, i) => {
        const m = data.modules[i];
        return (
          <div key={m.id} className={styles.anDetailsRow}>
            <span className={styles.anDetailsTitle}>
              Модуль {m.order} «{m.title}»:
            </span>
            {cell.state === 'LOCKED' ? (
              <span>
                ещё закрыт{m.opensAt ? `, откроется ${formatDateTime(m.opensAt)} (мск)` : ''}
              </span>
            ) : (
              <>
                <span>
                  {cell.visits > 0
                    ? `${cell.visits} ${plural(cell.visits, ['заход', 'захода', 'заходов'])} (первый ${formatDateTime(cell.firstVisitedAt)}, последний ${formatDateTime(cell.lastVisitedAt)})`
                    : 'страницу не открывали'}
                </span>
                <span>
                  {cell.lessonsStarted > 0
                    ? `начато ${cell.lessonsStarted} из ${cell.lessonsCount}, досмотрено ${cell.lessonsDone}${cell.lastCompletedAt ? ` (последний ${formatDateTime(cell.lastCompletedAt)})` : ''}`
                    : 'уроки не запускали'}
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );

  const modules = data?.modules ?? [];

  return (
    <AdminLayout wide>
      <div className={styles.head}>
        <span className="eyebrow eyebrowAccent">Клиенты</span>
        <h1 className="h2">
          Аналитика <span className="hAccent">прогресса</span>
        </h1>
        <p className="lead">
          Кто до какого места курса дошёл. Ступень — первый открытый модуль, который клиент
          ещё не прошёл. Админы не учитываются, отключённые аккаунты спрятаны. Клик по
          строке раскрывает даты.
        </p>
      </div>

      {error && (
        <p className={styles.error}>
          <SupportHint>{error}</SupportHint>
        </p>
      )}

      {loading && !data && <p className={styles.loading}>Загружаем…</p>}

      {data && (
        <>
          <div className={styles.anFunnel}>
            {STAGES.map((s) => (
              <button
                key={s.kind}
                type="button"
                className={`${styles.anTile} ${stageKind === s.kind ? styles.anTileActive : ''}`}
                onClick={() => setStageKind((prev) => (prev === s.kind ? null : s.kind))}
              >
                <span className={styles.anTileNum}>{funnel[s.kind]}</span>
                <span className={styles.anTileLabel}>{s.tile}</span>
              </button>
            ))}
          </div>

          <div className={styles.anToolbar}>
            <input
              className={styles.anInput}
              type="search"
              placeholder="Поиск по email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className={styles.anChips}>
              {QUICK.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`${styles.anChip} ${quick === f.id ? styles.anChipActive : ''}`}
                  onClick={() => setQuick(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.anToolbar}>
            <label className={styles.accountField}>
              <span className={styles.accountCaption}>модуль</span>
              <select
                className={styles.accountSelect}
                value={moduleIdx}
                onChange={(e) => setModuleIdx(e.target.value)}
              >
                <option value="">любой</option>
                {modules.map((m, i) => (
                  <option key={m.id} value={i}>
                    {m.order}. {m.title}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.accountField}>
              <span className={styles.accountCaption}>состояние</span>
              <select
                className={styles.accountSelect}
                value={moduleState}
                disabled={moduleIdx === ''}
                onChange={(e) => setModuleState(e.target.value)}
              >
                <option value="">любое</option>
                {Object.keys(STATE_LABELS)
                  .filter((s) => s !== 'LOCKED')
                  .map((s) => (
                    <option key={s} value={s}>
                      {STATE_LABELS[s]}
                    </option>
                  ))}
              </select>
            </label>
            <label className={styles.anCheck}>
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              показывать отключённых
            </label>
            {filtersActive && (
              <button type="button" className={styles.anChip} onClick={resetFilters}>
                Сбросить
              </button>
            )}
          </div>

          <div className={styles.anMeta}>
            <span>
              Показано {rows.length} из {base.length}
              {data.students.length !== base.length && ` (всего ${data.students.length})`}
            </span>
            <span>Данные на {formatDateTime(data.generatedAt)} (мск)</span>
            <span className={styles.anMetaActions}>
              <button type="button" className={styles.smallBtn} disabled={loading} onClick={load}>
                {loading ? 'Обновляем…' : 'Обновить'}
              </button>
              <button
                type="button"
                className={styles.smallBtn}
                disabled={rows.length === 0}
                onClick={exportCsv}
              >
                Экспорт CSV
              </button>
            </span>
          </div>

          {rows.length === 0 ? (
            <p className={styles.hint}>
              {base.length === 0 ? 'Клиентов пока нет.' : 'Под эти фильтры никто не попал.'}
            </p>
          ) : (
            <div className={styles.anTableWrap}>
              <table className={styles.anTable}>
                <thead>
                  <tr>
                    {renderSortHeader('email', 'Email')}
                    {renderSortHeader('stage', 'Ступень', 'Первый открытый модуль, который ещё не пройден')}
                    {renderSortHeader('activity', 'Активность', 'Последний запрос, заход в модуль или отметка урока')}
                    {renderSortHeader('progress', 'Прогресс', 'Досмотрено уроков из доступных в открытых модулях')}
                    {modules.map((m, i) =>
                      renderSortHeader(
                        `module:${i}`,
                        `М${m.order}`,
                        `${m.title}: уроков ${m.lessonsCount}${m.open ? '' : `, откроется ${formatDateTime(m.opensAt)} (мск)`}`
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const open = expanded === r.id;
                    const pct = r.lessonsAvailable
                      ? Math.round((r.lessonsDone / r.lessonsAvailable) * 100)
                      : 0;
                    return (
                      <React.Fragment key={r.id}>
                        <tr
                          className={`${styles.anRow} ${r.active ? '' : styles.anRowInactive}`}
                          onClick={() => setExpanded(open ? null : r.id)}
                        >
                          <td className={styles.anEmail} title={r.email}>
                            {r.email}
                            {r.plan && (
                              <span className={styles.anPlan}>{PLAN_LABELS[r.plan] ?? r.plan}</span>
                            )}
                            {!r.active && <span className={styles.anPlan}>отключён</span>}
                          </td>
                          <td className={styles.anStage}>{stageLabel(r.stage)}</td>
                          <td title={formatDateTime(r.lastActivityAt)}>
                            {r.lastActivityAt ? (
                              formatRelative(r.lastActivityAt, now)
                            ) : (
                              <span className={styles.anMuted}>—</span>
                            )}
                          </td>
                          <td>
                            <div className={styles.anProgress}>
                              <span>
                                {r.lessonsDone}/{r.lessonsAvailable}
                              </span>
                              <span className={styles.anBar} aria-hidden="true">
                                <span className={styles.anBarFill} style={{ width: `${pct}%` }} />
                              </span>
                            </div>
                          </td>
                          {r.modules.map((cell, i) => (
                            <td key={modules[i].id}>{renderCell(cell, modules[i])}</td>
                          ))}
                        </tr>
                        {open && (
                          <tr className={styles.anDetails}>
                            <td colSpan={4 + modules.length}>{renderDetails(r)}</td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className={styles.anLegend}>
            <span>В ячейке модуля — досмотрено/всего, «+N» — начатых, но не досмотренных.</span>
            {Object.keys(STATE_LABELS).map((s) => (
              <span key={s} className={`${styles.anPill} ${STATE_CLASS[s]}`}>
                {STATE_LABELS[s]}
              </span>
            ))}
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminAnalyticsPage;
