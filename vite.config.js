import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Временный mock-сервер: любые GET /api/<name> отдают mock/<name>.json.
 * Когда появится бэкенд — этот плагин убираем и ставим server.proxy.
 */
const mockApi = () => ({
  name: 'mock-api',
  configureServer(server) {
    server.middlewares.use('/api', (req, res, next) => {
      const name = req.url.split('?')[0].replace(/^\/+|\/+$/g, '');
      const file = path.resolve(__dirname, 'mock', `${name}.json`);
      if (!fs.existsSync(file)) return next();
      // Имитация сетевой задержки, чтобы были видны состояния загрузки
      setTimeout(() => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(fs.readFileSync(file));
      }, 200);
    });
  },
});

export default defineConfig({
  plugins: [react(), mockApi()],
});
