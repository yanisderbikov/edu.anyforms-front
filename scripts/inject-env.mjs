// Генерирует dist/env.js из переменных окружения при старте контейнера.
// Благодаря этому одна и та же сборка работает на дев/прод — без пересборки.
import { writeFileSync, existsSync } from 'node:fs';

const apiUrl = process.env.API_URL || process.env.VITE_API_URL || '';

const content = `window.__ENV__ = ${JSON.stringify({ API_URL: apiUrl })};\n`;

if (!existsSync('dist')) {
  console.error('inject-env: папка dist не найдена — сначала vite build');
  process.exit(1);
}

writeFileSync('dist/env.js', content);
console.log(`inject-env: API_URL = ${apiUrl || '(пусто — фолбэк из config.jsx)'}`);
