// ─── Types ─────────────────────────────────────────────────
export type {
  Article,
  Invoice,
  L402Token,
  PaymentSession,
  L402Challenge,
  L402Config,
  L402Request,
  L402MiddlewareConfig,
  ChallengeStore,
  ProtectedResourceInfo,
  ResourceResolver,
  ResourceResolverRegistry,
} from './types.js';

// ─── Macaroon ──────────────────────────────────────────────
export { MacaroonService } from './macaroon.js';
export type { MacaroonCaveat, MintParams, VerifyResult } from './macaroon.js';

// ─── Invoice ───────────────────────────────────────────────
export { InvoiceService } from './invoice.js';
export type { InvoiceServiceConfig, CreateInvoiceParams } from './invoice.js';

// ─── Middleware ────────────────────────────────────────────
export { L402Middleware, createL402Middleware } from './middleware.js';

// ─── Resources ─────────────────────────────────────────────
export { DefaultResourceResolverRegistry } from './resources.js';
