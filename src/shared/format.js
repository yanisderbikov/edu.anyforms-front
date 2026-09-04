/** 1234567 → «1,2 МБ»: размер файла для списка материалов */
export const formatFileSize = (bytes) => {
  if (bytes == null || Number.isNaN(bytes)) return '';
  let value = bytes;
  let unit = 'Б';
  for (const next of ['КБ', 'МБ', 'ГБ']) {
    if (value < 1024) break;
    value /= 1024;
    unit = next;
  }
  const rounded =
    value >= 100 || unit === 'Б'
      ? String(Math.round(value))
      : value.toFixed(1).replace('.', ',').replace(/,0$/, '');
  return `${rounded} ${unit}`;
};

/* ── Даты для админки: моменты приходят ISO в UTC, показываем по Москве ── */
const MSK = 'Europe/Moscow';

const toDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** «4 сент., 14:05» — время по Москве; пусто для null */
export const formatDateTime = (iso) => {
  const d = toDate(iso);
  return d
    ? d.toLocaleString('ru-RU', {
        timeZone: MSK,
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
};

/** «4 сент. 2026» — дата по Москве; пусто для null */
export const formatDate = (iso) => {
  const d = toDate(iso);
  return d
    ? d.toLocaleDateString('ru-RU', { timeZone: MSK, day: 'numeric', month: 'short', year: 'numeric' })
    : '';
};

/** plural(3, ['день', 'дня', 'дней']) → «дня» */
export const plural = (n, [one, few, many]) => {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
};

/** «только что», «5 мин назад», «3 ч назад», «вчера», «6 дней назад», «3 недели назад»… */
export const formatRelative = (iso, now = Date.now()) => {
  const d = toDate(iso);
  if (!d) return '';
  const minutes = Math.floor(Math.max(0, now - d.getTime()) / 60000);
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} ${plural(days, ['день', 'дня', 'дней'])} назад`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} ${plural(weeks, ['неделю', 'недели', 'недель'])} назад`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} ${plural(months, ['месяц', 'месяца', 'месяцев'])} назад`;
  }
  const years = Math.floor(days / 365);
  return `${years} ${plural(years, ['год', 'года', 'лет'])} назад`;
};

/** Сколько полных дней прошло с момента; null для пустого */
export const daysSince = (iso, now = Date.now()) => {
  const d = toDate(iso);
  return d ? Math.floor(Math.max(0, now - d.getTime()) / 86400000) : null;
};
