import React, { useLayoutEffect, useRef, useState } from 'react';
import styles from './ExpandableText.module.css';

/* Длинное описание сворачиваем до двух строк и даём «Раскрыть» —
   как подписи в инстаграме. Кнопка появляется, только если текст правда
   не помещается: пока свёрнут, сравниваем реальную высоту с обрезанной. */
const ExpandableText = ({ children, className = '', lines = 2, as: Tag = 'p' }) => {
  const ref = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [clipped, setClipped] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    /* В раскрытом виде обрезки нет: снимаем ограничение и держим прошлый
       ответ про переполнение, иначе кнопка «Свернуть» исчезнет сразу */
    if (expanded) {
      el.style.maxHeight = '';
      return undefined;
    }

    /* Режем по высоте, а не -webkit-line-clamp: clamp живёт только внутри
       display: -webkit-box, и в Safari на iOS вложенные блоки (абзацы,
       списки) раскладываются как элементы бокса — начало следующего блока
       вылезает на обрезанную строку рядом с многоточием */
    const measure = () => {
      const cs = getComputedStyle(el);
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.35;
      const max = `${Math.round(lh * lines)}px`;
      /* Своё же изменение высоты прилетает обратно в ResizeObserver —
         не трогаем стиль, если он уже тот самый */
      if (el.style.maxHeight !== max) el.style.maxHeight = max;
      setClipped(el.scrollHeight - el.clientHeight > 1);
    };
    measure();

    /* Ширина меняется при повороте экрана и после загрузки шрифта —
       число строк вместе с ней */
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children, lines, expanded]);

  return (
    <div className={styles.wrap}>
      <Tag ref={ref} className={`${className} ${expanded ? '' : styles.clamp}`}>
        {children}
      </Tag>
      {clipped && (
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Свернуть' : 'Раскрыть'}
        </button>
      )}
    </div>
  );
};

export default ExpandableText;
