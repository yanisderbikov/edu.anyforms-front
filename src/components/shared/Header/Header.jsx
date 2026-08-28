import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import styles from './Header.module.css';

/* Шапка с логотипом anyforms; слева и справа — произвольные слоты
   (бургер админки, иконки ЛК, выход).
   progress: { done, total } — трекинг внутри модуля: тонкая
   полоска-прогресс скролла по низу шапки + счётчик пройденных уроков. */
const Header = ({ left = null, right = null, progress = null }) => {
  const barRef = useRef(null);
  const hasProgress = Boolean(progress);

  /* Скролл-прогресс пишем в DOM напрямую, минуя state: ререндер страницы
     на каждое событие скролла — главный пожиратель CPU на слабых машинах.
     rAF схлопывает пачку событий в одну отрисовку за кадр. */
  useEffect(() => {
    if (!hasProgress) return;
    let raf = 0;
    const paint = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 100;
      if (barRef.current) barRef.current.style.width = `${pct}%`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [hasProgress]);

  return (
    <header className={`${styles.header} ${progress ? styles.hasProgress : ''}`}>
      <div className={styles.inner}>
        {left && <div className={styles.left}>{left}</div>}
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
          <div ref={barRef} className={styles.scrollBar} />
        </div>
      )}
    </header>
  );
};

export default Header;
