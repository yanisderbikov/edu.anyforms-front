import React from 'react';
import styles from './Skeleton.module.css';

/**
 * Серый блок-заглушка с бегущим бликом. Из таких собирается «призрак» страницы:
 * раскладка появляется сразу, а текст и картинки подставляются, когда придут данные.
 * Размеры задаются пропами или своим классом — здесь только фон и анимация.
 */
const Skeleton = ({ width, height, radius, className = '', style }) => (
  <span
    className={`${styles.skeleton} ${className}`}
    style={{ width, height, borderRadius: radius, ...style }}
    aria-hidden="true"
  />
);

export default Skeleton;
