import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Header.module.css';

/* Шапка с логотипом anyforms; справа — произвольные иконки (ЛК, выход).
   progress: { scroll: 0..100, done, total } — трекинг внутри модуля:
   тонкая полоска-прогресс по низу шапки + счётчик пройденных уроков. */
const Header = ({ right = null, progress = null }) => (
  <header className={`${styles.header} ${progress ? styles.hasProgress : ''}`}>
    <div className={styles.inner}>
      {progress && (
        <span
          className={`${styles.lessonsChip} ${
            progress.done >= progress.total ? styles.lessonsChipDone : ''
          }`}
        >
          {progress.done >= progress.total ? '✓ Модуль пройден' : `Пройдено ${progress.done} / ${progress.total}`}
        </span>
      )}
      <Link to="/" className={styles.logoLink} aria-label="На главную">
        <img className={styles.logo} src="/anyforms_logo_new_white.svg" alt="anyforms" />
      </Link>
      <div className={styles.right}>{right}</div>
    </div>
    {progress && (
      <div className={styles.scrollTrack} aria-hidden="true">
        <div className={styles.scrollBar} style={{ width: `${progress.scroll}%` }} />
      </div>
    )}
  </header>
);

export default Header;
