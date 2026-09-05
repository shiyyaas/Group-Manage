import express, { Request, Response, Express } from 'express';
import { PORT } from './config.js';
import { deduplicationEngine } from './deduper.js';
import { getConnectionStatus } from './whatsapp.js';

/**
 * Express application factory.
 */
export function createServer(): Express {
  const app = express();

  app.use(express.json());

  /**
   * GET /api/messages
   * Returns array of clean, deduplicated, combined group messages.
   */
  app.get('/api/messages', (_req: Request, res: Response) => {
    const messages = deduplicationEngine.getMessages();
    res.json(messages);
  });

  /**
   * GET /api/status
   * Returns connection status ('CONNECTED', 'SCAN_QR', or 'DISCONNECTED').
   */
  app.get('/api/status', (_req: Request, res: Response) => {
    const status = getConnectionStatus();
    res.json({ status });
  });

  return app;
}

/**
 * Starts the Express REST API server listening on the specified port.
 */
export function startServer(port: number = PORT) {
  const app = createServer();
  return app.listen(port, () => {
    console.log(`[REST API] Server running and listening on port ${port}`);
  });
}
