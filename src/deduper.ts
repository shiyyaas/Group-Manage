import { TARGET_GROUPS, CACHE_MAX_SIZE, CACHE_TTL_MS } from './config.js';

export interface DeduplicatedMessage {
  content: string;
  sender: string;
  group: string;
  timestamp: string;
}

export interface IncomingMessageInput {
  chatJid: string;
  senderJid: string;
  senderName?: string;
  groupName?: string;
  content: string;
  timestamp?: string | number;
}

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'fbclid',
  'gclid',
  'msclkid',
  'si',
  'igshid',
  'ref',
  '_hsenc',
  'mc_cid',
  'mc_eid',
  'pk_campaign',
  'pk_kwd',
]);

/**
 * Removes tracking parameters from URLs within text.
 */
export function removeTrackingLinks(text: string): string {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  return text.replace(urlRegex, (match) => {
    try {
      const url = new URL(match);
      const keysToDelete: string[] = [];
      url.searchParams.forEach((_, key) => {
        const lowerKey = key.toLowerCase();
        if (TRACKING_PARAMS.has(lowerKey) || lowerKey.startsWith('utm_')) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach((key) => url.searchParams.delete(key));
      return url.toString();
    } catch {
      return match;
    }
  });
}

/**
 * Normalizes message text by trimming whitespace, lowercasing, and removing tracking links.
 */
export function normalizeText(text: string): string {
  const cleanText = removeTrackingLinks(text);
  return cleanText.trim().toLowerCase();
}

/**
 * Creates a unique string fingerprint for a message: `${senderJID}_${normalizedText}`.
 */
export function generateFingerprint(senderJid: string, normalizedText: string): string {
  return `${senderJid}_${normalizedText}`;
}

/**
 * Group Filtering and Rolling Deduplication Engine.
 */
export class DeduplicationEngine {
  private targetGroups: Set<string>;
  private cacheMaxSize: number;
  private cacheTtlMs: number;
  private cache: Map<string, number> = new Map();
  private messages: DeduplicatedMessage[] = [];

  constructor(
    targetGroups: string[] = TARGET_GROUPS,
    cacheMaxSize: number = CACHE_MAX_SIZE,
    cacheTtlMs: number = CACHE_TTL_MS
  ) {
    this.targetGroups = new Set(targetGroups);
    this.cacheMaxSize = cacheMaxSize;
    this.cacheTtlMs = cacheTtlMs;
  }

  public isTargetGroup(chatJid: string): boolean {
    return this.targetGroups.has(chatJid);
  }

  public processMessage(input: IncomingMessageInput): DeduplicatedMessage | null {
    if (!this.isTargetGroup(input.chatJid)) {
      return null;
    }

    if (!input.content || !input.content.trim()) {
      return null;
    }

    const normalized = normalizeText(input.content);
    const fingerprint = generateFingerprint(input.senderJid, normalized);

    const now = Date.now();
    this.cleanupCache(now);

    if (this.cache.has(fingerprint)) {
      return null;
    }

    this.cache.set(fingerprint, now);
    this.enforceCacheLimit();

    const timestampIso = typeof input.timestamp === 'number'
      ? new Date(input.timestamp).toISOString()
      : (input.timestamp || new Date().toISOString());

    const deduplicatedMsg: DeduplicatedMessage = {
      content: input.content,
      sender: input.senderName || input.senderJid,
      group: input.groupName || input.chatJid,
      timestamp: timestampIso,
    };

    this.messages.push(deduplicatedMsg);
    return deduplicatedMsg;
  }

  private cleanupCache(now: number): void {
    for (const [fp, time] of this.cache.entries()) {
      if (now - time > this.cacheTtlMs) {
        this.cache.delete(fp);
      }
    }
  }

  private enforceCacheLimit(): void {
    while (this.cache.size > this.cacheMaxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      } else {
        break;
      }
    }
  }

  public getMessages(): DeduplicatedMessage[] {
    return [...this.messages];
  }

  public clear(): void {
    this.cache.clear();
    this.messages = [];
  }
}

// Global deduplication engine instance
export const deduplicationEngine = new DeduplicationEngine();
