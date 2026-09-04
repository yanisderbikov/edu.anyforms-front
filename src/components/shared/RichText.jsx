import React from 'react';
import styles from './RichText.module.css';

/* Лёгкая разметка описаний из админки:
     *текст*      — жирный
     ~текст~      — наклонный
     ссылка       — кликабельная, показывается одним доменом
     «- пункт»    — маркированный список с отступом и точкой
     «1. пункт»   — нумерованный список с отступом
     «→ пункт»    — такой же список, только маркер — стрелка
     →            — стрелка в тексте в акцентном цвете, как маркеры списков
   Компонент отдаёт набор блоков без обёртки: контейнер задаёт родитель. */

/* Маркер парного выделения либо ссылка целиком */
const TOKEN = /\*([^*\n]+)\*|~([^~\n]+)~|(https?:\/\/[^\s<>"')\]]+|www\.[^\s<>"')\]]+)/g;

/* Хвостовая пунктуация к ссылке не относится: «(см. https://a.ru/b).» */
const TRAILING = /[.,;:!?)»"']+$/;

/* Строки-пункты: дефис любого начертания, «1.» / «1)» или стрелка */
const BULLET = /^[-–—•]\s+(.+)$/;
const ORDERED = /^(\d+)[.)]\s+(.+)$/;
const ARROW_ITEM = /^→\s*(.+)$/;

/* Стрелки — в акцентном цвете, как маркеры списков. Красим и внутри
   жирного/наклонного, поэтому это не токен TOKEN, а отдельный проход
   по каждому текстовому куску */
const ARROWS = /(→+)/;
const withArrows = (text, keyBase) =>
  text.split(ARROWS).map((part, i) =>
    ARROWS.test(part) ? (
      <span key={`${keyBase}-${i}`} className={styles.arrow}>
        {part}
      </span>
    ) : (
      part
    )
  );

/* Ссылку показываем коротко — одним доменом, без www и пути */
const domainOf = (url) => {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

/* Разметка внутри строки: выделения и ссылки */
const inline = (text, plainLinks) => {
  const nodes = [];
  let last = 0;
  let key = 0;

  for (const m of text.matchAll(TOKEN)) {
    const [raw, bold, italic, link] = m;

    /* Ссылка могла «съесть» точку в конце предложения — возвращаем её в текст */
    const tail = link ? (link.match(TRAILING)?.[0] ?? '') : '';
    const url = link ? link.slice(0, link.length - tail.length) : '';
    if (link && !url) continue;

    if (m.index > last) nodes.push(...withArrows(text.slice(last, m.index), key++));

    if (bold) {
      nodes.push(
        <strong key={key++} className={styles.bold}>
          {withArrows(bold, 0)}
        </strong>
      );
    } else if (italic) {
      nodes.push(
        <em key={key++} className={styles.italic}>
          {withArrows(italic, 0)}
        </em>
      );
    } else {
      nodes.push(
        plainLinks ? (
          <span key={key++} className={styles.linkPlain}>
            {domainOf(url)}
          </span>
        ) : (
          <a
            key={key++}
            className={styles.link}
            href={url.startsWith('http') ? url : `https://${url}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            {domainOf(url)}
          </a>
        )
      );
      if (tail) nodes.push(tail);
    }

    last = m.index + raw.length;
  }

  if (last < text.length) nodes.push(...withArrows(text.slice(last), key++));
  return nodes;
};

/* Строки → блоки: подряд идущие пункты собираются в один список,
   остальное копится в обычный текстовый абзац */
const toBlocks = (text) => {
  const blocks = [];
  let paragraph = [];
  let list = null; // { type: 'ul' | 'ol' | 'arrow', start, items }

  const flushParagraph = () => {
    /* Пустые строки вокруг списка в абзац не тащим — иначе при pre-line
       появляются лишние пробельные строки */
    while (paragraph.length && !paragraph[paragraph.length - 1].trim()) paragraph.pop();
    if (paragraph.length) blocks.push({ type: 'p', text: paragraph.join('\n') });
    paragraph = [];
  };

  const flushList = () => {
    if (list) blocks.push(list);
    list = null;
  };

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const bullet = line.match(BULLET);
    const ordered = !bullet && line.match(ORDERED);
    const arrow = !bullet && !ordered && line.match(ARROW_ITEM);

    if (!bullet && !ordered && !arrow) {
      flushList();
      /* Пустая строка сразу после списка — уже отбита отступом самого списка */
      if (line || paragraph.length) paragraph.push(raw);
      continue;
    }

    flushParagraph();
    const type = bullet ? 'ul' : ordered ? 'ol' : 'arrow';
    if (list?.type !== type) {
      flushList();
      list = { type, start: ordered ? Number(ordered[1]) : 1, items: [] };
    }
    list.items.push(bullet ? bullet[1] : ordered ? ordered[2] : arrow[1]);
  }

  flushParagraph();
  flushList();
  return blocks;
};

/* plainLinks — карточка модуля сама завёрнута в <Link>, вложенная ссылка
   там недопустима: показываем домен просто цветом, без перехода */
const RichText = ({ text, plainLinks = false }) => {
  if (!text) return null;

  return (
    <>
      {toBlocks(text).map((block, i) => {
        if (block.type === 'p') {
          return (
            <span key={i} className={styles.para}>
              {inline(block.text, plainLinks)}
            </span>
          );
        }
        /* Список со стрелками — тот же <ul>, но маркер рисует CSS: браузерный
           ::marker менять на «→» умеют не все */
        const List = block.type === 'ol' ? 'ol' : 'ul';
        const arrows = block.type === 'arrow';
        return (
          <List
            key={i}
            className={arrows ? `${styles.list} ${styles.listArrow}` : styles.list}
            start={block.type === 'ol' && block.start !== 1 ? block.start : undefined}
          >
            {block.items.map((item, j) => (
              <li key={j} className={arrows ? `${styles.item} ${styles.itemArrow}` : styles.item}>
                {inline(item, plainLinks)}
              </li>
            ))}
          </List>
        );
      })}
    </>
  );
};

export default RichText;
