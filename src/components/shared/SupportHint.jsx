import React from 'react';
import toast from 'react-hot-toast';
import config from '../../config';

/**
 * Любая ошибка сервиса показывается со ссылкой на телеграм поддержки:
 * «…текст ошибки. Наш чат поддержки @AnyFormsBot».
 */
const SupportHint = ({ children }) => (
  <>
    {children}{' '}
    Наш чат поддержки{' '}
    <a
      href={config.supportUrl}
      target="_blank"
      rel="noreferrer"
      style={{ color: 'inherit', fontWeight: 600, textDecoration: 'underline' }}
    >
      {config.supportHandle}
    </a>
  </>
);

/** toast.error с припиской про поддержку — для админки и прочих уведомлений */
export const toastError = (messageOrError) => {
  const message = messageOrError?.message ?? String(messageOrError);
  toast.error(<SupportHint>{message}</SupportHint>);
};

export default SupportHint;
