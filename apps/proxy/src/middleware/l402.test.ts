import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextFunction, Request } from 'express';
import { L402Middleware } from './l402.js';

function createMockResponse() {
  const res: {
    statusCode: number;
    headers: Record<string, string>;
    body?: unknown;
    status: (code: number) => unknown;
    set: (key: string, value: string) => unknown;
    json: (payload: unknown) => unknown;
  } = {
    statusCode: 200,
    headers: {},
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    set(key: string, value: string) {
      this.headers[key] = value;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };

  return res;
}

function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    path: '/api/articles/article-1/content',
    params: { id: 'article-1' },
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  } as unknown as Request;
}

describe('L402Middleware security checks', () => {
  let middleware: L402Middleware;
  let invoiceService: {
    createInvoice: ReturnType<typeof vi.fn>;
    getInvoiceStatus: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    middleware = new L402Middleware({
      rootKey: 'a'.repeat(64),
      expirySeconds: 3600,
      priceCkb: 100,
      resourceProvider: () => ({
        id: 'article-1',
        type: 'article',
        priceCkb: 100,
      }),
    });

    invoiceService = (middleware as unknown as { invoiceService: typeof invoiceService }).invoiceService;
    vi.spyOn(invoiceService, 'createInvoice').mockResolvedValue({
      paymentHash: '0x' + 'f'.repeat(64),
      invoiceAddress: 'fibt100000000001ptest',
      amount: '0x1',
      description: 'test',
      expiry: 3600,
      createdAt: 1,
    });
    vi.spyOn(invoiceService, 'getInvoiceStatus').mockResolvedValue('Paid');
  });

  it('accepts connected-node flow with verified macaroon and paid invoice', async () => {
    const macaroonService = (middleware as unknown as { macaroonService: { mint: Function } }).macaroonService;
    const paymentHash = '0x' + '1'.repeat(64);
    const { macaroon } = macaroonService.mint({
      identifier: 'ok-1',
      paymentHash,
      resourceId: 'article-1',
      resourceType: 'article',
      expirySeconds: 3600,
    });

    invoiceService.getInvoiceStatus.mockResolvedValueOnce('Paid');

    const req = createMockRequest({ headers: { authorization: `L402 ${macaroon}` } });
    const res = createMockResponse();
    const next = vi.fn<NextFunction>();

    await middleware.handle(req as any, res as any, next as any);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
  });

  it('rejects tampered macaroon in connected-node flow', async () => {
    const macaroonService = (middleware as unknown as { macaroonService: { mint: Function } }).macaroonService;
    const { macaroon } = macaroonService.mint({
      identifier: 'bad-1',
      paymentHash: '0x' + '2'.repeat(64),
      resourceId: 'article-1',
      resourceType: 'article',
      expirySeconds: 3600,
    });

    const exported = JSON.parse(Buffer.from(macaroon, 'base64').toString('utf-8'));
    const caveatStr = Buffer.from(exported.c[0].i).toString('utf-8');
    exported.c[0].i = Array.from(Buffer.from(caveatStr.replace('payment_hash=0x', 'payment_hash=0xdead'), 'utf-8'));
    const tamperedMacaroon = Buffer.from(JSON.stringify(exported), 'utf-8').toString('base64');

    const req = createMockRequest({ headers: { authorization: `L402 ${tamperedMacaroon}` } });
    const res = createMockResponse();
    const next = vi.fn<NextFunction>();

    await middleware.handle(req as any, res as any, next as any);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect((res.body as { error?: string }).error).toBeDefined();
  });

  it('rejects expired macaroon in connected-node flow', async () => {
    const macaroonService = (middleware as unknown as { macaroonService: { mint: Function } }).macaroonService;
    const { macaroon } = macaroonService.mint({
      identifier: 'bad-2',
      paymentHash: '0x' + '3'.repeat(64),
      resourceId: 'article-1',
      resourceType: 'article',
      expirySeconds: -1,
    });

    const req = createMockRequest({ headers: { authorization: `L402 ${macaroon}` } });
    const res = createMockResponse();
    const next = vi.fn<NextFunction>();

    await middleware.handle(req as any, res as any, next as any);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect((res.body as { error?: string }).error).toContain('expired');
  });

  it('rejects missing resource_type caveat when resource type is required', async () => {
    const macaroonService = (middleware as unknown as { macaroonService: { mint: Function } }).macaroonService;
    const { macaroon } = macaroonService.mint({
      identifier: 'bad-3',
      paymentHash: '0x' + '4'.repeat(64),
      resourceId: 'article-1',
      expirySeconds: 3600,
    });

    const req = createMockRequest({ headers: { authorization: `L402 ${macaroon}` } });
    const res = createMockResponse();
    const next = vi.fn<NextFunction>();

    await middleware.handle(req as any, res as any, next as any);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect((res.body as { error?: string }).error).toContain('Missing resource_type');
  });

  it('rejects mismatched X-L402-Payment-Hash header', async () => {
    const macaroonService = (middleware as unknown as { macaroonService: { mint: Function } }).macaroonService;
    const { macaroon } = macaroonService.mint({
      identifier: 'bad-4',
      paymentHash: '0x' + '5'.repeat(64),
      resourceId: 'article-1',
      resourceType: 'article',
      expirySeconds: 3600,
    });

    const req = createMockRequest({
      headers: {
        authorization: `L402 ${macaroon}`,
        'x-l402-payment-hash': '0x' + '9'.repeat(64),
      },
    });
    const res = createMockResponse();
    const next = vi.fn<NextFunction>();

    await middleware.handle(req as any, res as any, next as any);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect((res.body as { error?: string }).error).toContain('header mismatch');
  });

  it('rejects resource id mismatch for connected-node flow', async () => {
    const macaroonService = (middleware as unknown as { macaroonService: { mint: Function } }).macaroonService;
    const { macaroon } = macaroonService.mint({
      identifier: 'bad-5',
      paymentHash: '0x' + '6'.repeat(64),
      resourceId: 'article-other',
      resourceType: 'article',
      expirySeconds: 3600,
    });

    const req = createMockRequest({ headers: { authorization: `L402 ${macaroon}` } });
    const res = createMockResponse();
    const next = vi.fn<NextFunction>();

    await middleware.handle(req as any, res as any, next as any);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect((res.body as { error?: string }).error).toContain('Resource id mismatch');
  });
});
