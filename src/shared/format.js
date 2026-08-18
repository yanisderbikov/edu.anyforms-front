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
