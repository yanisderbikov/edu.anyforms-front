import React from 'react';
import styles from './SupportTiles.module.css';

export const ChatIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-2.9-.36-4.1-1L3 20l1.05-5.2A8.5 8.5 0 1 1 21 11.5Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LifeBuoyIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="12" cy="12" r="3.6" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="m5.65 5.65 3.8 3.8M14.55 14.55l3.8 3.8M18.35 5.65l-3.8 3.8M9.45 14.55l-3.8 3.8"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

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

const Tile = ({ href, icon, label }) => (
  <a className={styles.tile} href={href} target="_blank" rel="noreferrer">
    <span className={styles.icon}>{icon}</span>
    <span className={styles.bottom}>
      <span className={styles.label}>{label}</span>
      <span className={styles.arrow}>
        <ArrowIcon />
      </span>
    </span>
  </a>
);

/**
 * Поддержка и чат: две большие плитки в одну строку — прозрачные в рамке,
 * при наведении заливаются акцентом снизу вверх. Стоят под модулями на
 * главной и в конце страницы модуля. Ссылки и подписи приходят с бэкенда
 * (support курса); чего нет — то не показываем.
 */
const SupportTiles = ({ support, className = '' }) => {
  if (!support?.supportUrl && !support?.chatUrl) return null;

  return (
    <div className={`${styles.row} ${className}`}>
      {support.supportUrl && (
        <Tile
          href={support.supportUrl}
          icon={<LifeBuoyIcon />}
          label={support.supportLabel || 'Поддержка'}
        />
      )}
      {support.chatUrl && (
        <Tile href={support.chatUrl} icon={<ChatIcon />} label={support.chatLabel || 'Чат'} />
      )}
    </div>
  );
};

export default SupportTiles;
