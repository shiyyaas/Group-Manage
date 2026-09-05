import { describe, it, expect, beforeEach } from 'vitest';
import {
  removeTrackingLinks,
  normalizeText,
  generateFingerprint,
  DeduplicationEngine,
} from './deduper.js';

describe('Deduplication Engine', () => {
  describe('removeTrackingLinks', () => {
    it('strips tracking query parameters from URLs', () => {
      const text = 'Check out this deal: https://example.com/product?utm_source=twitter&utm_medium=social&id=123&fbclid=xyz';
      const clean = removeTrackingLinks(text);
      expect(clean).toContain('id=123');
      expect(clean).not.toContain('utm_source');
      expect(clean).not.toContain('utm_medium');
      expect(clean).not.toContain('fbclid');
    });

    it('removes tracking params like si, igshid, ref, gclid', () => {
      const text = 'https://youtu.be/video123?si=abcdef123456 https://instagram.com/p/123?igshid=xyz789';
      const clean = removeTrackingLinks(text);
      expect(clean).not.toContain('si=');
      expect(clean).not.toContain('igshid=');
    });

    it('leaves non-URL text and clean URLs untouched', () => {
      const text = 'Hello world https://example.com/item?page=2';
      const clean = removeTrackingLinks(text);
      expect(clean).toBe(text);
    });
  });

  describe('normalizeText', () => {
    it('trims whitespace and converts text to lowercase', () => {
      const normalized = normalizeText('   Hello WORLD!  ');
      expect(normalized).toBe('hello world!');
    });

    it('normalizes URLs inside text', () => {
      const normalized = normalizeText('  Check HTTPS://Example.Com/test?UTM_SOURCE=abc&Ref=123   ');
      expect(normalized).toContain('https://example.com/test');
      expect(normalized).not.toContain('utm_source');
      expect(normalized).not.toContain('ref');
    });
  });

  describe('generateFingerprint', () => {
    it('combines sender JID and normalized text into fingerprint', () => {
      const fp = generateFingerprint('123456789@s.whatsapp.net', 'hello world');
      expect(fp).toBe('123456789@s.whatsapp.net_hello world');
    });
  });

  describe('DeduplicationEngine class', () => {
    let engine: DeduplicationEngine;
    const targetGroup = '120363000000000000@g.us';
    const nonTargetGroup = '999999999999999999@g.us';

    beforeEach(() => {
      engine = new DeduplicationEngine([targetGroup], 5, 1000);
    });

    it('immediately drops messages from non-target groups', () => {
      const result = engine.processMessage({
        chatJid: nonTargetGroup,
        senderJid: 'user1@s.whatsapp.net',
        content: 'Hello non target group',
      });

      expect(result).toBeNull();
      expect(engine.getMessages()).toHaveLength(0);
    });

    it('accepts and stores valid messages from target group', () => {
      const result = engine.processMessage({
        chatJid: targetGroup,
        senderJid: 'user1@s.whatsapp.net',
        senderName: 'Alice',
        content: 'Important Announcement',
        timestamp: 1600000000000,
      });

      expect(result).not.toBeNull();
      expect(result?.content).toBe('Important Announcement');
      expect(result?.sender).toBe('Alice');
      expect(result?.group).toBe(targetGroup);
      expect(engine.getMessages()).toHaveLength(1);
    });

    it('suppresses cross-posted duplicate messages with matching fingerprints', () => {
      const msg1 = engine.processMessage({
        chatJid: targetGroup,
        senderJid: 'user1@s.whatsapp.net',
        content: 'Breaking News: https://news.com?utm_source=feed',
      });

      const msg2 = engine.processMessage({
        chatJid: targetGroup,
        senderJid: 'user1@s.whatsapp.net',
        content: '  BREAKING news: https://news.com?utm_source=twitter  ',
      });

      expect(msg1).not.toBeNull();
      expect(msg2).toBeNull(); // Suppressed as duplicate
      expect(engine.getMessages()).toHaveLength(1);
    });

    it('evicts oldest items when rolling cache max size is reached', () => {
      const smallEngine = new DeduplicationEngine([targetGroup], 2, 60000);

      smallEngine.processMessage({
        chatJid: targetGroup,
        senderJid: 'user1@s.whatsapp.net',
        content: 'Msg 1',
      });

      smallEngine.processMessage({
        chatJid: targetGroup,
        senderJid: 'user2@s.whatsapp.net',
        content: 'Msg 2',
      });

      // Adding 3rd message pushes out Msg 1 fingerprint from cache
      smallEngine.processMessage({
        chatJid: targetGroup,
        senderJid: 'user3@s.whatsapp.net',
        content: 'Msg 3',
      });

      // Now Msg 1 should be allowed again because its fingerprint was evicted
      const reprocessedMsg1 = smallEngine.processMessage({
        chatJid: targetGroup,
        senderJid: 'user1@s.whatsapp.net',
        content: 'Msg 1',
      });

      expect(reprocessedMsg1).not.toBeNull();
    });
  });
});
