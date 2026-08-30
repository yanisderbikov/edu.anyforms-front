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
    /* В раскрытом виде обрезки нет, мерить нечего — держим прошлый ответ,
       иначе кнопка «Свернуть» исчезнет сразу после раскрытия */
    if (!el || expanded) return undefined;

    const measure = () => setClipped(el.scrollHeight - el.clientHeight > 1);
    measure();

    /* Ширина меняется при повороте экрана и после загрузки шрифта —
       число строк вместе с ней */
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children, lines, expanded]);

  return (
    <div className={styles.wrap}>
      <Tag
        ref={ref}
        className={`${className} ${expanded ? '' : styles.clamp}`}
        style={{ '--clamp-lines': lines }}
      >
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
