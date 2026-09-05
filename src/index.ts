import { PORT } from './config.js';
import { startServer } from './server.js';
import { startWhatsAppSocket } from './whatsapp.js';

async function main() {
  console.log('[Engine] Starting Headless WhatsApp Data Engine...');

  // Start REST API server
  startServer(PORT);

  // Start WhatsApp connection stream
  await startWhatsAppSocket();
}

main().catch((err) => {
  console.error('[Engine] Fatal error during startup:', err);
  process.exit(1);
});
