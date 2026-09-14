import React from 'react';
import RichText from '../RichText';
import styles from './FeedbackBlock.module.css';

const ArrowIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M8 16 16 8M9.5 8H16v6.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const DEFAULT_FEEDBACK_TITLE = 'Поделитесь впечатлениями о модуле';
export const DEFAULT_FEEDBACK_LABEL = 'Оставить обратную связь';

/**
 * Блок обратной связи в конце модуля: заголовок и одна большая кнопка-ссылка.
 * Заголовок, описание, подпись и ссылка настраиваются в админке на каждом модуле;
 * без ссылки блок не показываем, без текстов — берём значения по умолчанию,
 * без описания — просто нет абзаца.
 */
const FeedbackBlock = ({ title, description, label, url, className = '' }) => {
  if (!url) return null;

  return (
    <section className={`${styles.block} ${className}`} aria-label="Обратная связь">
      <h2 className={`h3 ${styles.title}`}>{title || DEFAULT_FEEDBACK_TITLE}</h2>
      {description && (
        <div className={styles.description}>
          <RichText text={description} />
        </div>
      )}
      <a className={styles.button} href={url} target="_blank" rel="noreferrer">
        <span>{label || DEFAULT_FEEDBACK_LABEL}</span>
        <span className={styles.arrow}>
          <ArrowIcon />
        </span>
      </a>
    </section>
  );
};

export default FeedbackBlock;
