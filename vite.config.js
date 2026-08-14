import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Данные курса отдаёт бэкенд edu.anyforms-back (localhost:8091).
// Мок остался в mock/course.json — если бэк не поднят, можно вернуть плагин из git-истории.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8091',
    },
  },
});
