import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Адрес бэка задаётся ТОЛЬКО через VITE_API_URL (см. src/config.jsx):
// локально — .env.development, на стендах — переменная окружения при сборке.
// Прокси не используем, чтобы механизм был один и тот же везде.
export default defineConfig({
  plugins: [react()],
});
