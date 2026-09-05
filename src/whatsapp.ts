import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  type WASocket,
} from '@whiskeysockets/baileys';
import qrcodeTerminal from 'qrcode-terminal';
import { pino } from 'pino';
import { SESSION_DIR } from './config.js';
import { deduplicationEngine } from './deduper.js';

export type ConnectionStatus = 'CONNECTED' | 'SCAN_QR' | 'DISCONNECTED';

let connectionStatus: ConnectionStatus = 'DISCONNECTED';
let socket: WASocket | null = null;

export function getConnectionStatus(): ConnectionStatus {
  return connectionStatus;
}

export function setConnectionStatus(status: ConnectionStatus): void {
  connectionStatus = status;
}

/**
 * Extracts plain text content from a Baileys message object.
 */
export function extractMessageContent(msg: any): string | null {
  if (!msg || !msg.message) return null;
  const m = msg.message;

  const messageObj =
    m.ephemeralMessage?.message ||
    m.viewOnceMessage?.message ||
    m.viewOnceMessageV2?.message ||
    m;

  return (
    messageObj.conversation ||
    messageObj.extendedTextMessage?.text ||
    messageObj.imageMessage?.caption ||
    messageObj.videoMessage?.caption ||
    messageObj.documentMessage?.caption ||
    null
  );
}

/**
 * Initializes and starts the Baileys WhatsApp connection socket.
 */
export async function startWhatsAppSocket(): Promise<WASocket> {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const logger = pino({ level: 'silent' });

  socket = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
  });

  socket.ev.on('creds.update', saveCreds);

  socket.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      connectionStatus = 'SCAN_QR';
      console.log('\n--- WhatsApp Authentication QR Code ---');
      qrcodeTerminal.generate(qr, { small: true });
      console.log('Please scan the QR code using WhatsApp on your phone.\n');
    }

    if (connection === 'open') {
      connectionStatus = 'CONNECTED';
      console.log('[WhatsApp Engine] Successfully connected to WhatsApp.');
    } else if (connection === 'close') {
      connectionStatus = 'DISCONNECTED';
      const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`[WhatsApp Engine] Connection closed (statusCode: ${statusCode}). Reconnecting: ${shouldReconnect}`);

      if (shouldReconnect) {
        setTimeout(() => {
          startWhatsAppSocket().catch((err) => {
            console.error('[WhatsApp Engine] Error reconnecting socket:', err);
          });
        }, 3000);
      }
    }
  });

  socket.ev.on('messages.upsert', async (upsert) => {
    for (const msg of upsert.messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const chatJid = msg.key.remoteJid;
      if (!chatJid) continue;

      const content = extractMessageContent(msg);
      if (!content) continue;

      const senderJid = msg.key.participant || msg.key.remoteJid || '';
      const senderName = msg.pushName || senderJid;
      const timestamp = msg.messageTimestamp
        ? typeof msg.messageTimestamp === 'number'
          ? msg.messageTimestamp * 1000
          : Number(msg.messageTimestamp) * 1000
        : Date.now();

      deduplicationEngine.processMessage({
        chatJid,
        senderJid,
        senderName,
        groupName: chatJid,
        content,
        timestamp,
      });
    }
  });

  return socket;
}
