import React from 'react';
import styles from './LegalFooter.module.css';

/* 152-ФЗ: политика обработки ПДн должна быть доступна не только в точке сбора
   e-mail (логин), но и в любой момент пользования платформой — поэтому ссылка
   стоит в подвале всех страниц после входа. Оператор — тот же, что и продавец
   курса на anyforms.ru. */
const PRIVACY_URL = 'https://anyforms.ru/course/privacy';
const REQUISITES_URL = 'https://anyforms.ru/founders/dmitry?from=course';

const LegalFooter = () => (
  <footer className={styles.footer}>
    <div className={styles.inner}>
      <span className={styles.operator}>
        © anyforms · ИП Суворов Дмитрий Игоревич · ИНН 590699241510 · ОГРНИП 324784700274710
      </span>
      <span className={styles.links}>
        <a className={styles.link} href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
          Политика обработки персональных данных
        </a>
        <a className={styles.link} href={REQUISITES_URL} target="_blank" rel="noopener noreferrer">
          Реквизиты
        </a>
      </span>
    </div>
  </footer>
);

export default LegalFooter;
