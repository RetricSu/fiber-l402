import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvoiceService } from './invoice.js';

const sdkMocks = vi.hoisted(() => ({
  newInvoice: vi.fn(),
  getPayment: vi.fn(),
  getInvoice: vi.fn(),
  parseInvoice: vi.fn(),
  FiberRpcClient: vi.fn(),
}));

vi.mock('@fiber-pay/sdk', () => ({
  FiberRpcClient: sdkMocks.FiberRpcClient,
}));

describe('InvoiceService', () => {
  let service: InvoiceService;

  beforeEach(() => {
    sdkMocks.newInvoice.mockReset();
    sdkMocks.getPayment.mockReset();
    sdkMocks.getInvoice.mockReset();
    sdkMocks.parseInvoice.mockReset();
    sdkMocks.FiberRpcClient.mockReset();
    sdkMocks.FiberRpcClient.mockImplementation(function thisFiberRpcClientMock(this: {
      newInvoice: typeof sdkMocks.newInvoice;
      getPayment: typeof sdkMocks.getPayment;
      getInvoice: typeof sdkMocks.getInvoice;
      parseInvoice: typeof sdkMocks.parseInvoice;
    }) {
      this.newInvoice = sdkMocks.newInvoice;
      this.getPayment = sdkMocks.getPayment;
      this.getInvoice = sdkMocks.getInvoice;
      this.parseInvoice = sdkMocks.parseInvoice;
    });

    service = new InvoiceService({
      rpcUrl: 'http://localhost:8227',
    });
  });

  describe('createInvoice', () => {
    it('should create invoice with correct parameters', async () => {
      sdkMocks.newInvoice.mockResolvedValueOnce({
        invoice_address: 'fibt1000000001p5h0qhlmw7q5',
        invoice: {
          currency: 'Fibt',
          amount: '0x5f5e100',
          data: {
            payment_hash: '0x' + 'a'.repeat(64),
            timestamp: '0x1234567890',
            attrs: [
              { Description: 'Test invoice' },
              { ExpiryTime: '0xe10' },
            ],
          },
        },
      });

      const invoice = await service.createInvoice({
        amount: '0x5f5e100',
        description: 'Test invoice',
        currency: 'Fibt',
      });

      expect(sdkMocks.newInvoice).toHaveBeenCalledTimes(1);
      expect(sdkMocks.newInvoice).toHaveBeenCalledWith(expect.objectContaining({
        amount: '0x5f5e100',
        currency: 'Fibt',
      }));

      expect(invoice.paymentHash).toBe('0x' + 'a'.repeat(64));
      expect(invoice.amount).toBe('0x5f5e100');
      expect(invoice.description).toBe('Test invoice');
    });

    it('should throw on RPC error', async () => {
      sdkMocks.newInvoice.mockRejectedValueOnce(new Error('RPC error: Invalid request'));

      await expect(
        service.createInvoice({
          amount: '0x5f5e100',
          currency: 'Fibt',
        })
      ).rejects.toThrow('RPC error: Invalid request');
    });

    it('should parse nested payment_hash from invoice.data', async () => {
      sdkMocks.newInvoice.mockResolvedValueOnce({
        invoice_address: 'fibt1000000001pnested',
        invoice: {
          currency: 'Fibt',
          amount: '0x5f5e100',
          data: {
            payment_hash: '0x' + 'b'.repeat(64),
            timestamp: '0x1234567891',
            attrs: [
              { description: 'Nested format invoice' },
              { expiry_time: '0xe10' },
            ],
          },
        },
      });

      const invoice = await service.createInvoice({
        amount: '0x5f5e100',
        currency: 'Fibt',
      });

      expect(invoice.paymentHash).toBe('0x' + 'b'.repeat(64));
      expect(invoice.description).toBe('Nested format invoice');
      expect(invoice.expiry).toBe(parseInt('0xe10', 16));
    });
  });

  describe('getPaymentStatus', () => {
    it('should return success for successful payment', async () => {
      sdkMocks.getPayment.mockResolvedValueOnce({
        payment_hash: '0x' + 'a'.repeat(64),
        status: 'Success',
      });

      const status = await service.getPaymentStatus('0x' + 'a'.repeat(64));
      expect(status).toBe('success');
    });

    it('should return pending for created payment', async () => {
      sdkMocks.getPayment.mockResolvedValueOnce({
        payment_hash: '0x' + 'a'.repeat(64),
        status: 'Created',
      });

      const status = await service.getPaymentStatus('0x' + 'a'.repeat(64));
      expect(status).toBe('pending');
    });

    it('should return pending when payment not found', async () => {
      sdkMocks.getPayment.mockRejectedValueOnce(new Error('Not found'));

      const status = await service.getPaymentStatus('0x' + 'a'.repeat(64));
      expect(status).toBe('pending');
    });
  });

  describe('parseInvoiceAddress', () => {
    it('should parse invoice address via SDK', async () => {
      sdkMocks.parseInvoice.mockResolvedValueOnce({
        invoice: {
          currency: 'Fibt',
          amount: '0x64',
          data: {
            payment_hash: '0x' + 'c'.repeat(64),
            timestamp: '0x1',
            attrs: [{ ExpiryTime: '0xe10' }],
          },
        },
      });

      const parsed = await service.parseInvoiceAddress('fibt100000000001ptest');

      expect(parsed.paymentHash).toBe('0x' + 'c'.repeat(64));
      expect(parsed.amount).toBe('0x64');
      expect(parsed.expiry).toBe(parseInt('0xe10', 16));
    });
  });

  describe('getInvoiceStatus', () => {
    it('should return invoice status when RPC succeeds', async () => {
      sdkMocks.getInvoice.mockResolvedValueOnce({ status: 'Paid' });

      const status = await service.getInvoiceStatus('0x' + 'd'.repeat(64));
      expect(status).toBe('Paid');
    });

    it('should return Unknown on RPC error', async () => {
      sdkMocks.getInvoice.mockRejectedValueOnce(new Error('unreachable'));

      const status = await service.getInvoiceStatus('0x' + 'e'.repeat(64));
      expect(status).toBe('Unknown');
    });
  });
});
