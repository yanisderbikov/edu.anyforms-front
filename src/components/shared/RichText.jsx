import React from 'react';
import styles from './RichText.module.css';

/* Лёгкая разметка описаний из админки:
     *текст*      — жирный
     ~текст~      — наклонный
     ссылка       — кликабельная, показывается одним доменом
     «- пункт»    — маркированный список с отступом и точкой
     «1. пункт»   — нумерованный список с отступом
   Компонент отдаёт набор блоков без обёртки: контейнер задаёт родитель. */

/* Маркер парного выделения либо ссылка целиком */
const TOKEN = /\*([^*\n]+)\*|~([^~\n]+)~|(https?:\/\/[^\s<>"')\]]+|www\.[^\s<>"')\]]+)/g;

/* Хвостовая пунктуация к ссылке не относится: «(см. https://a.ru/b).» */
const TRAILING = /[.,;:!?)»"']+$/;

/* Строки-пункты: дефис любого начертания или «1.» / «1)» */
const BULLET = /^[-–—•]\s+(.+)$/;
const ORDERED = /^(\d+)[.)]\s+(.+)$/;

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

    if (m.index > last) nodes.push(text.slice(last, m.index));

    if (bold) nodes.push(<strong key={key++} className={styles.bold}>{bold}</strong>);
    else if (italic) nodes.push(<em key={key++} className={styles.italic}>{italic}</em>);
    else {
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

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
};

/* Строки → блоки: подряд идущие пункты собираются в один список,
   остальное копится в обычный текстовый абзац */
const toBlocks = (text) => {
  const blocks = [];
  let paragraph = [];
  let list = null; // { type: 'ul' | 'ol', start, items }

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

    if (!bullet && !ordered) {
      flushList();
      /* Пустая строка сразу после списка — уже отбита отступом самого списка */
      if (line || paragraph.length) paragraph.push(raw);
      continue;
    }

    flushParagraph();
    const type = bullet ? 'ul' : 'ol';
    if (list?.type !== type) {
      flushList();
      list = { type, start: ordered ? Number(ordered[1]) : 1, items: [] };
    }
    list.items.push(bullet ? bullet[1] : ordered[2]);
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
        const List = block.type === 'ul' ? 'ul' : 'ol';
        return (
          <List
            key={i}
            className={styles.list}
            start={block.type === 'ol' && block.start !== 1 ? block.start : undefined}
          >
            {block.items.map((item, j) => (
              <li key={j} className={styles.item}>
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
