import React, { useEffect, useRef } from 'react';

/**
 * Textarea, растущая под контент: минимум minRows строк,
 * дальше высота подстраивается сама — тянуть за уголок не нужно.
 */
const AutoTextarea = ({ minRows = 5, value, style, ...rest }) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value}
      style={{ overflow: 'hidden', resize: 'none', ...style }}
      {...rest}
    />
  );
};

export default AutoTextarea;
