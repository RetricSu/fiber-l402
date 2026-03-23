import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvoiceService } from './invoice.js';

describe('InvoiceService', () => {
  let service: InvoiceService;

  beforeEach(() => {
    service = new InvoiceService({
      rpcUrl: 'http://localhost:8227',
    });
  });

  describe('createInvoice', () => {
    it('should create invoice with correct parameters', async () => {
      // Mock fetch
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            invoice_address: 'fibt1000000001p5h0qhlmw7q5',
            invoice: {
              payment_hash: '0x' + 'a'.repeat(64),
              amount: '0x5f5e100',
              currency: 'Fibt',
              description: 'Test invoice',
              expiry: '0xe10',
              timestamp: '0x1234567890',
              hash_algorithm: 'sha256',
            },
          },
        }),
      } as Response);

      const invoice = await service.createInvoice({
        amount: '0x5f5e100',
        description: 'Test invoice',
        currency: 'Fibt',
      });

      expect(invoice.paymentHash).toBe('0x' + 'a'.repeat(64));
      expect(invoice.amount).toBe('0x5f5e100');
      expect(invoice.description).toBe('Test invoice');
    });

    it('should throw on RPC error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: { code: -32600, message: 'Invalid request' },
        }),
      } as Response);

      await expect(
        service.createInvoice({
          amount: '0x5f5e100',
          currency: 'Fibt',
        })
      ).rejects.toThrow('RPC error: Invalid request');
    });
  });

  describe('getPaymentStatus', () => {
    it('should return success for successful payment', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            payment_hash: '0x' + 'a'.repeat(64),
            status: 'Success',
          },
        }),
      } as Response);

      const status = await service.getPaymentStatus('0x' + 'a'.repeat(64));
      expect(status).toBe('success');
    });

    it('should return pending for created payment', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            payment_hash: '0x' + 'a'.repeat(64),
            status: 'Created',
          },
        }),
      } as Response);

      const status = await service.getPaymentStatus('0x' + 'a'.repeat(64));
      expect(status).toBe('pending');
    });

    it('should return pending when payment not found', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Not found'));

      const status = await service.getPaymentStatus('0x' + 'a'.repeat(64));
      expect(status).toBe('pending');
    });
  });
});
