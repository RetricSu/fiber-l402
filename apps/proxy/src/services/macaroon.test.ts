import { describe, it, expect, beforeEach } from 'vitest';
import { createHash } from 'crypto';
import { MacaroonService } from './macaroon.js';

describe('MacaroonService', () => {
  let service: MacaroonService;
  const testRootKey = 'a'.repeat(64); // 32 bytes in hex

  beforeEach(() => {
    service = new MacaroonService(testRootKey);
  });

  describe('mint', () => {
    it('should create macaroon with payment hash caveat', () => {
      const result = service.mint({
        identifier: 'test-1',
        paymentHash: '0x' + 'b'.repeat(64),
        resourceId: 'article-1',
        resourceType: 'article',
      });

      expect(result.macaroon).toBeDefined();
      expect(result.caveats).toHaveLength(4); // payment_hash, expiry, resource_id, resource_type
      
      const paymentHashCaveat = result.caveats.find(c => c.condition === 'payment_hash');
      expect(paymentHashCaveat?.value).toBe('0x' + 'b'.repeat(64));
    });

    it('should create macaroon without article_id', () => {
      const result = service.mint({
        identifier: 'test-2',
        paymentHash: '0x' + 'c'.repeat(64),
      });

      expect(result.caveats).toHaveLength(2); // payment_hash, expiry only
    });

    it('should use custom expiry', () => {
      const result = service.mint({
        identifier: 'test-3',
        paymentHash: '0x' + 'd'.repeat(64),
        expirySeconds: 7200,
      });

      const expiryCaveat = result.caveats.find(c => c.condition === 'expiry');
      expect(expiryCaveat).toBeDefined();
    });
  });

  describe('verify', () => {
    it('should verify valid macaroon with matching preimage', () => {
      const preimage = '0x' + 'e'.repeat(64);
      const paymentHash = '0x' + createHash('sha256')
        .update(Buffer.from('e'.repeat(64), 'hex'))
        .digest('hex');

      const { macaroon } = service.mint({
        identifier: 'test-4',
        paymentHash,
      });

      const result = service.verify(macaroon, preimage);
      expect(result.valid).toBe(true);
      expect(result.caveats).toBeDefined();
    });

    it('should reject invalid preimage', () => {
      const { macaroon } = service.mint({
        identifier: 'test-5',
        paymentHash: '0x' + 'f'.repeat(64),
      });

      const wrongPreimage = '0x' + '0'.repeat(64);
      const result = service.verify(macaroon, wrongPreimage);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('hash mismatch');
    });

    it('should reject expired macaroon', async () => {
      const preimage = '0x' + 'a'.repeat(64);
      const paymentHash = '0x' + createHash('sha256')
        .update(Buffer.from('a'.repeat(64), 'hex'))
        .digest('hex');

      // Create with past expiry
      const { macaroon } = service.mint({
        identifier: 'test-6',
        paymentHash,
        expirySeconds: -1, // Already expired
      });

      // Wait a bit for expiry to be in the past
      await new Promise(r => setTimeout(r, 100));

      const result = service.verify(macaroon, preimage);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });
  });

  describe('extractCaveats', () => {
    it('should extract all caveats from macaroon', () => {
      const { macaroon } = service.mint({
        identifier: 'test-7',
        paymentHash: '0x' + '1'.repeat(64),
        resourceId: 'article-7',
        resourceType: 'article',
      });

      const caveats = service.extractCaveats(macaroon);
      expect(caveats.payment_hash).toBe('0x' + '1'.repeat(64));
      expect(caveats.resource_id).toBe('article-7');
      expect(caveats.resource_type).toBe('article');
      expect(caveats.expiry).toBeDefined();
    });

    it('should return empty object for invalid macaroon', () => {
      const caveats = service.extractCaveats('invalid-base64');
      expect(caveats).toEqual({});
    });
  });

  describe('verifyWithoutPreimage', () => {
    it('should verify valid macaroon without preimage', () => {
      const { macaroon } = service.mint({
        identifier: 'test-8',
        paymentHash: '0x' + '2'.repeat(64),
        resourceId: 'article-8',
        resourceType: 'article',
      });

      const result = service.verifyWithoutPreimage(macaroon);
      expect(result.valid).toBe(true);
      expect(result.caveats?.payment_hash).toBe('0x' + '2'.repeat(64));
      expect(result.caveats?.resource_id).toBe('article-8');
      expect(result.caveats?.resource_type).toBe('article');
    });

    it('should reject expired macaroon without preimage', async () => {
      const { macaroon } = service.mint({
        identifier: 'test-9',
        paymentHash: '0x' + '3'.repeat(64),
        expirySeconds: -1,
      });

      await new Promise(r => setTimeout(r, 100));

      const result = service.verifyWithoutPreimage(macaroon);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should reject tampered macaroon without preimage', () => {
      const { macaroon } = service.mint({
        identifier: 'test-10',
        paymentHash: '0x' + '4'.repeat(64),
      });

      const exported = JSON.parse(Buffer.from(macaroon, 'base64').toString('utf-8'));
      const caveatBytes: number[] = exported.c[0].i;
      const caveatStr = Buffer.from(caveatBytes).toString('utf-8');
      const tampered = caveatStr.replace('payment_hash=0x', 'payment_hash=0xdead');
      exported.c[0].i = Array.from(Buffer.from(tampered, 'utf-8'));

      const tamperedMacaroon = Buffer.from(JSON.stringify(exported), 'utf-8').toString('base64');
      const result = service.verifyWithoutPreimage(tamperedMacaroon);
      expect(result.valid).toBe(false);
    });
  });
});
