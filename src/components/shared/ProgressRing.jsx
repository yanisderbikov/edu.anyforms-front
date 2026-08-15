import React, { useEffect, useState } from 'react';

const GREEN = '#4caf7d';
const TRACK = 'rgba(255, 255, 255, 0.12)';

/** Реагируем на смену ширины экрана (поворот телефона, ресайз окна) */
const useIsMobile = (breakpoint = 640) => {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia(`(max-width: ${breakpoint}px)`).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [breakpoint]);
  return isMobile;
};

/**
 * Кольцо прогресса: зелёная дуга по кругу, в центре «1/4»
 * и, если задано, подпись под числом («пройдено»).
 * mobileSize/mobileStroke — компактный вариант для узких экранов.
 */
const ProgressRing = ({
  done,
  total,
  size = 56,
  stroke = 5,
  caption = null,
  mobileSize = null,
  mobileStroke = null,
}) => {
  const isMobile = useIsMobile();
  if (isMobile && mobileSize) {
    size = mobileSize;
    stroke = mobileStroke ?? stroke;
  }
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = total > 0 ? Math.min(done / total, 1) : 0;

  return (
    <div
      style={{ position: 'relative', width: size, height: size, flex: 'none' }}
      role="img"
      aria-label={`Пройдено ${done} из ${total}`}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={TRACK}
          strokeWidth={stroke}
        />
        {/* При нуле дугу не рисуем: скруглённый конец давал зелёную точку */}
        {ratio > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={GREEN}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference * ratio} ${circumference}`}
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        )}
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1.1,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: size >= 80 ? 20 : 14, color: 'var(--text)' }}>
          {done}/{total}
        </span>
        {caption && (
          <span
            style={{
              fontSize: size >= 80 ? 10 : 8,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              color: 'var(--text-faint)',
              fontWeight: 600,
            }}
          >
            {caption}
          </span>
        )}
      </div>
    </div>
  );
};

export default ProgressRing;
