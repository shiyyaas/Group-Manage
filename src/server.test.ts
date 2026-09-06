import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Server } from 'http';
import { createServer } from './server.js';
import { deduplicationEngine } from './deduper.js';
import { setConnectionStatus } from './whatsapp.js';

describe('Express REST API Server', () => {
  let server: Server;
  let baseUrl: string;
  const targetGroup = '120363000000000000@g.us';

  beforeEach(async () => {
    deduplicationEngine.clear();
    setConnectionStatus('DISCONNECTED');

    const app = createServer();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr !== 'string') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  describe('GET /api/status', () => {
    it('returns DISCONNECTED by default', async () => {
      const res = await fetch(`${baseUrl}/api/status`);
      expect(res.status).toBe(200);
      const data = (await res.json()) as Record<string, unknown>;
      expect(data).toEqual({ status: 'DISCONNECTED' });
    });

    it('returns SCAN_QR when status is SCAN_QR', async () => {
      setConnectionStatus('SCAN_QR');
      const res = await fetch(`${baseUrl}/api/status`);
      expect(res.status).toBe(200);
      const data = (await res.json()) as Record<string, unknown>;
      expect(data).toEqual({ status: 'SCAN_QR' });
    });

    it('returns CONNECTED when status is CONNECTED', async () => {
      setConnectionStatus('CONNECTED');
      const res = await fetch(`${baseUrl}/api/status`);
      expect(res.status).toBe(200);
      const data = (await res.json()) as Record<string, unknown>;
      expect(data).toEqual({ status: 'CONNECTED' });
    });
  });

  describe('GET /api/messages', () => {
    it('returns empty array when no messages exist', async () => {
      const res = await fetch(`${baseUrl}/api/messages`);
      expect(res.status).toBe(200);
      const data = (await res.json()) as unknown[];
      expect(data).toEqual([]);
    });

    it('returns clean deduplicated messages array', async () => {
      deduplicationEngine.processMessage({
        chatJid: targetGroup,
        senderJid: 'user1@s.whatsapp.net',
        senderName: 'Alice',
        groupName: 'Tech Group',
        content: 'Hello World',
        timestamp: 1700000000000,
      });

      const res = await fetch(`${baseUrl}/api/messages`);
      expect(res.status).toBe(200);
      const data = (await res.json()) as Array<Record<string, unknown>>;
      expect(data).toHaveLength(1);
      expect(data[0]).toMatchObject({
        content: 'Hello World',
        sender: 'Alice',
        group: 'Tech Group',
      });
    });
  });
});
