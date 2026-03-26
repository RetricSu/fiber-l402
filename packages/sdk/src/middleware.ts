import type { Request, Response, NextFunction } from 'express';
import type { L402Request, L402MiddlewareConfig, ProtectedResourceInfo } from './types.js';
import { MacaroonService } from './macaroon.js';
import { InvoiceService } from './invoice.js';

interface L402ResourceResolver {
  resolve(req: Request): Promise<ProtectedResourceInfo | undefined>;
}

type LegacyResourceProvider =
  (req: Request) => Promise<ProtectedResourceInfo | undefined> | ProtectedResourceInfo | undefined;

export class L402Middleware {
  private config: L402MiddlewareConfig;
  private rateLimitStore: Map<string, { count: number; resetTime: number }>;
  private macaroonService: MacaroonService;
  private invoiceService: InvoiceService;
  private resourceResolver?: L402ResourceResolver;

  constructor(config: Partial<L402MiddlewareConfig> & {
    resourceResolver?: L402ResourceResolver;
    resourceProvider?: LegacyResourceProvider;
  } = {}) {
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
    if (config.resourceResolver) {
      this.resourceResolver = config.resourceResolver;
    } else if (config.resourceProvider) {
      this.resourceResolver = {
        resolve: async (req: Request) => config.resourceProvider?.(req),
      };
    }
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

    const resource = this.resourceResolver ? await this.resourceResolver.resolve(req) : undefined;

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('L402 ')) {
      return this.issueChallenge(req, res, 402, undefined, resource);
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
        return this.issueChallenge(req, res, 401, result.error, resource);
      }

      const headerError = this.validatePaymentHashHeader(req, result.caveats || {});
      if (headerError) {
        return this.issueChallenge(req, res, 401, headerError, resource);
      }

      const validateError = this.validateResourceCaveats(result.caveats || {}, resource);
      if (validateError) {
        return this.issueChallenge(req, res, 401, validateError, resource);
      }

      req.l402 = { valid: true, preimage };
      next();
      return;
    }

    // Path B: connected-node flow without preimage.
    // We still verify macaroon signature and caveats (including expiry), then
    // verify invoice settlement via Fiber RPC.
    const verifyResult = this.macaroonService.verifyWithoutPreimage(macaroon);
    if (!verifyResult.valid) {
      return this.issueChallenge(req, res, 401, verifyResult.error, resource);
    }

    const caveats = verifyResult.caveats || {};
    const paymentHash = caveats.payment_hash;
    if (!paymentHash) {
      return this.issueChallenge(req, res, 401, 'Missing payment hash caveat', resource);
    }

    const headerError = this.validatePaymentHashHeader(req, caveats);
    if (headerError) {
      return this.issueChallenge(req, res, 401, headerError, resource);
    }

    const validateError = this.validateResourceCaveats(caveats, resource);
    if (validateError) {
      return this.issueChallenge(req, res, 401, validateError, resource);
    }

    const invoiceStatus = await this.invoiceService.getInvoiceStatus(paymentHash);
    if (invoiceStatus !== 'Paid') {
      return this.issueChallenge(req, res, 401, `Invoice not settled (status: ${invoiceStatus})`, resource);
    }

    req.l402 = { valid: true, paymentHash };
    next();
  }

  private validateResourceCaveats(caveats: Record<string, string>, resource?: ProtectedResourceInfo): string | undefined {
    if (!resource) {
      return undefined;
    }

    if (resource.id && caveats.resource_id && caveats.resource_id !== resource.id) {
      return 'Resource id mismatch';
    }

    if (resource.type && caveats.resource_type && caveats.resource_type !== resource.type) {
      return 'Resource type mismatch';
    }

    if (resource.id && !caveats.resource_id) {
      return 'Missing resource_id in macaroon';
    }

    if (resource.type && !caveats.resource_type) {
      return 'Missing resource_type in macaroon';
    }

    return undefined;
  }

  private validatePaymentHashHeader(req: Request, caveats: Record<string, string>): string | undefined {
    const rawHeader = req.headers['x-l402-payment-hash'];
    const headerPaymentHash = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    if (!headerPaymentHash) {
      return undefined;
    }

    const caveatPaymentHash = caveats.payment_hash;
    if (!caveatPaymentHash) {
      return 'Missing payment hash caveat';
    }

    if (headerPaymentHash !== caveatPaymentHash) {
      return 'Payment hash header mismatch';
    }

    return undefined;
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
    errorMessage?: string,
    resource?: ProtectedResourceInfo
  ): Promise<void> {
    try {
      const { macaroon, invoice } = await this.createChallenge(req, resource);
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

  private async createChallenge(req: Request, resource?: ProtectedResourceInfo): Promise<{ macaroon: string; invoice: string }> {
    const priceCkb = resource?.priceCkb ?? this.config.priceCkb;
    const amountShannons = `0x${(priceCkb * 100000000).toString(16)}`;

    const invoice = await this.invoiceService.createInvoice({
      amount: amountShannons,
      description: `L402 Payment ${resource?.type ?? 'resource'}`,
      currency: 'Fibt',
      expirySeconds: this.config.expirySeconds,
    });

    const { macaroon } = this.macaroonService.mint({
      identifier: `l402-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      paymentHash: invoice.paymentHash,
      expirySeconds: this.config.expirySeconds,
      resourceId: resource?.id,
      resourceType: resource?.type,
      location: req.headers.host || 'fiber-l402',
    });

    return { macaroon, invoice: invoice.invoiceAddress };
  }
}

export function createL402Middleware(config: Partial<L402MiddlewareConfig> & {
  resourceResolver?: L402ResourceResolver;
  resourceProvider?: LegacyResourceProvider;
} = {}) {
  const middleware = new L402Middleware(config);
  return middleware.handle.bind(middleware);
}
