import React from 'react';
import styles from './RichText.module.css';

/* Лёгкая разметка описаний из админки:
     *текст*  — жирный
     ~текст~  — наклонный
     ссылка   — кликабельная, показывается одним доменом
   Переносы строк сохраняет CSS (white-space: pre-line у класса multiline). */

/* Маркер парного выделения либо ссылка целиком */
const TOKEN = /\*([^*\n]+)\*|~([^~\n]+)~|(https?:\/\/[^\s<>"')\]]+|www\.[^\s<>"')\]]+)/g;

/* Хвостовая пунктуация к ссылке не относится: «(см. https://a.ru/b).» */
const TRAILING = /[.,;:!?)»"']+$/;

/* Ссылку показываем коротко — одним доменом, без www и пути */
const domainOf = (url) => {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

/* plainLinks — карточка модуля сама завёрнута в <Link>, вложенная ссылка
   там недопустима: показываем домен просто цветом, без перехода */
const RichText = ({ text, className = '', plainLinks = false }) => {
  if (!text) return null;

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
    else if (italic) nodes.push(<em key={key++}>{italic}</em>);
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

  return <span className={className}>{nodes}</span>;
};

export default RichText;
