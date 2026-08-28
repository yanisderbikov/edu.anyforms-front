/* Работа со ссылками Kinescope.

   В поле «видео» урока лежит ссылка вида https://kinescope.io/embed/{id} —
   её ставит кнопка загрузки, руками ссылки не вводят. У ссылок, заведённых
   раньше вставкой embed-кода, в хэше может быть доля высоты: #ratio=177.78. */

const EMBED_RE = /(?:https?:\/\/)?(?:www\.)?kinescope\.io\/(?:embed\/)?([A-Za-z0-9_-]{8,})/;

/* Ссылка урока → { videoId, aspectRatio (ширина/высота) } или null, если это не Kinescope.
   Без хэша #ratio считаем видео горизонтальным 16:9. */
export function parseKinescope(url) {
  const match = url?.match(EMBED_RE);
  if (!match) return null;
  const padding = Number(url.match(/#ratio=([\d.]+)/)?.[1]);
  return {
    videoId: match[1],
    aspectRatio: padding > 0 ? 100 / padding : 16 / 9,
  };
}
