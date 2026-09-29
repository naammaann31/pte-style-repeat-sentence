import express from 'express';
import fs from 'node:fs';
import { config } from './config.js';
import { questionsRouter } from './routes/questions.js';
import { attemptsRouter } from './routes/attempts.js';

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.use('/api/questions', questionsRouter);
  app.use('/api', attemptsRouter);

  // Serve the built React app in production (single-port deployment). In
  // development, Vite's dev server runs separately and proxies /api here.
  if (fs.existsSync(config.clientDistDir)) {
    app.use(express.static(config.clientDistDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(`${config.clientDistDir}/index.html`);
    });
  }

  // Final error handler (asyncHandler already formats most errors; this is
  // the last-resort net for anything synchronous that slips through).
  app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] Unhandled error:`, err);
    if (res.headersSent) return next(err);
    res.status(500).json({ error: { message: 'Unexpected server error.' } });
  });

  return app;
}
