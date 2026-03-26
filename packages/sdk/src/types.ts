// ─── Article ───────────────────────────────────────────────
// Blog article content (example resource type)
export interface Article {
  id: string;
  title: string;
  author: string;
  date: string; // ISO date
  price: number; // CKB amount
  preview: string; // First ~200 chars
  content: string; // Full markdown content
  tags: string[];
}

// ─── Invoice ───────────────────────────────────────────────
// Fiber Network invoice
export interface Invoice {
  paymentHash: string;
  invoiceAddress: string; // Fibt/fibb address
  amount: string; // In shannons (hex)
  description: string;
  expiry: number; // Unix timestamp
  createdAt: number;
}

// ─── L402 Token ────────────────────────────────────────────
// Authorization token
export interface L402Token {
  macaroon: string; // Base64 encoded
  preimage: string; // Hex string
}

// ─── Payment Session ───────────────────────────────────────
// Tracks payment state
export interface PaymentSession {
  id: string;
  articleId: string;
  invoice: Invoice;
  status: 'pending' | 'paid' | 'expired';
  createdAt: number;
  paidAt?: number;
}

// ─── L402 Challenge ────────────────────────────────────────
// 402 response data
export interface L402Challenge {
  macaroon: string;
  invoice: string; // Invoice address
}

// ─── L402 Config ───────────────────────────────────────────
// Middleware configuration
export interface L402Config {
  rootKey: string; // Hex string for macaroon signing
  expirySeconds: number; // Default: 3600 (1 hour)
  priceCkb: number; // Default article price
}

// ─── L402 Middleware Types ─────────────────────────────────
import type { Request } from 'express';

export interface L402Request extends Request {
  l402?: {
    valid: boolean;
    preimage?: string;
    paymentHash?: string;
    token?: L402Token;
  };
}

export interface L402MiddlewareConfig extends L402Config {
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

export interface ChallengeStore {
  get(key: string): L402Challenge | undefined;
  set(key: string, value: L402Challenge): void;
  delete(key: string): void;
  has(key: string): boolean;
}

// ─── Resource Types ────────────────────────────────────────
export interface ProtectedResourceInfo {
  id?: string;
  type?: string;
  priceCkb?: number;
}

export interface ResourceResolver {
  name: string;
  matches(req: Request): boolean;
  resolve(req: Request): Promise<ProtectedResourceInfo | undefined>;
}

export interface ResourceResolverRegistry {
  register(resolver: ResourceResolver): void;
  resolve(req: Request): Promise<ProtectedResourceInfo | undefined>;
}
