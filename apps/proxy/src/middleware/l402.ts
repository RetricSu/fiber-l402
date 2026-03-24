import type { Request, Response, NextFunction } from 'express';
import type { L402Request, L402MiddlewareConfig } from '../types/l402.js';
import { MacaroonService } from '../services/macaroon.js';
import { InvoiceService } from '../services/invoice.js';

export class L402Middleware {
  private config: L402MiddlewareConfig;
  private rateLimitStore: Map<string, { count: number; resetTime: number }>;
  private macaroonService: MacaroonService;
  private invoiceService: InvoiceService;

  constructor(config: Partial<L402MiddlewareConfig> = {}) {
    this.config = {
      rootKey: config.rootKey || process.env.L402_ROOT_KEY || 'default-key',
      expirySeconds: config.expirySeconds || 3600,
      priceCkb: config.priceCkb || 100,
      rateLimitWindowMs: config.rateLimitWindowMs || 60000,
      rateLimitMaxRequests: config.rateLimitMaxRequests || 100,
    };
    this.rateLimitStore = new Map();
    this.macaroonService = new MacaroonService(this.config.rootKey);
    this.invoiceService = new InvoiceService();
  }

  async handle(req: L402Request, res: Response, next: NextFunction): Promise<void> {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!this.checkRateLimit(clientIp)) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil(this.config.rateLimitWindowMs / 1000),
      });
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('L402 ')) {
      return this.issueChallenge(req, res);
    }

    const [, token] = authHeader.split(' ');
    if (!token) {
      return this.issueChallenge(req, res);
    }

    const splitIndex = token.indexOf(':');
    const macaroon = splitIndex >= 0 ? token.slice(0, splitIndex) : token;
    const preimage = splitIndex >= 0 ? token.slice(splitIndex + 1) : undefined;

    if (!macaroon) {
      return this.issueChallenge(req, res);
    }

    // Path A: legacy flow with explicit preimage (manual entry).
    if (preimage) {
      const result = this.macaroonService.verify(macaroon, preimage);
      if (!result.valid) {
        return this.issueChallenge(req, res, 401, result.error);
      }

      req.l402 = { valid: true, preimage };
      next();
      return;
    }

    // Path B: connected-node flow without preimage; trust paid invoice status.
    const caveats = this.macaroonService.extractCaveats(macaroon);
    const paymentHash = caveats.payment_hash;
    if (!paymentHash) {
      return this.issueChallenge(req, res, 401, 'Missing payment hash caveat');
    }

    const invoiceStatus = await this.invoiceService.getInvoiceStatus(paymentHash);
    if (invoiceStatus !== 'Paid') {
      return this.issueChallenge(req, res, 401, `Invoice not settled (status: ${invoiceStatus})`);
    }

    req.l402 = { valid: true, paymentHash };
    next();
  }

  private checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = this.rateLimitStore.get(ip);

    if (!record) {
      this.rateLimitStore.set(ip, {
        count: 1,
        resetTime: now + this.config.rateLimitWindowMs,
      });
      return true;
    }

    if (now > record.resetTime) {
      this.rateLimitStore.set(ip, {
        count: 1,
        resetTime: now + this.config.rateLimitWindowMs,
      });
      return true;
    }

    if (record.count >= this.config.rateLimitMaxRequests) {
      return false;
    }

    record.count++;
    return true;
  }

  private async issueChallenge(
    req: Request,
    res: Response,
    statusCode: number = 402,
    errorMessage?: string
  ): Promise<void> {
    try {
      const { macaroon, invoice } = await this.createChallenge(req);
      const wwwAuthenticate = `L402 macaroon="${macaroon}", invoice="${invoice}"`;

      res.status(statusCode)
        .set('WWW-Authenticate', wwwAuthenticate)
        .json({
          error: errorMessage || 'Payment Required',
          macaroon,
          invoice,
        });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to create payment challenge',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async createChallenge(req: Request): Promise<{ macaroon: string; invoice: string }> {
    const amountShannons = `0x${(this.config.priceCkb * 100000000).toString(16)}`;

    const invoice = await this.invoiceService.createInvoice({
      amount: amountShannons,
      description: 'L402 Payment',
      currency: 'Fibt',
      expirySeconds: this.config.expirySeconds,
    });

    const { macaroon } = this.macaroonService.mint({
      identifier: `l402-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      paymentHash: invoice.paymentHash,
      expirySeconds: this.config.expirySeconds,
      location: req.headers.host || 'fiber-l402',
    });

    return { macaroon, invoice: invoice.invoiceAddress };
  }
}

export function createL402Middleware(config?: Partial<L402MiddlewareConfig>) {
  const middleware = new L402Middleware(config);
  return middleware.handle.bind(middleware);
}
