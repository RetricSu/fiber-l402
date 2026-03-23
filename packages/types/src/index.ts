// Article - Blog article content
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

// Invoice - Fiber Network invoice
export interface Invoice {
  paymentHash: string;
  invoiceAddress: string; // Fibt/fibb address
  amount: string; // In shannons (hex)
  description: string;
  expiry: number; // Unix timestamp
  createdAt: number;
}

// L402Token - Authorization token
export interface L402Token {
  macaroon: string; // Base64 encoded
  preimage: string; // Hex string
}

// PaymentSession - Tracks payment state
export interface PaymentSession {
  id: string;
  articleId: string;
  invoice: Invoice;
  status: 'pending' | 'paid' | 'expired';
  createdAt: number;
  paidAt?: number;
}

// L402Challenge - 402 response data
export interface L402Challenge {
  macaroon: string;
  invoice: string; // Invoice address
}

// L402Config - Middleware configuration
export interface L402Config {
  rootKey: string; // Hex string for macaroon signing
  expirySeconds: number; // Default: 3600 (1 hour)
  priceCkb: number; // Default article price
}
