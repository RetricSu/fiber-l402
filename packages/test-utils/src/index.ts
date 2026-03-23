import { vi } from 'vitest';
import type { Article, Invoice, PaymentSession } from '@fiber-l402/types';

export function createMockArticle(overrides?: Partial<Article>): Article {
  return {
    id: 'test-article-1',
    title: 'Test Article',
    author: 'Test Author',
    date: new Date().toISOString(),
    price: 100,
    preview: 'This is a preview...',
    content: '# Test Article\n\nFull content here',
    tags: ['test'],
    ...overrides,
  };
}

export function createMockInvoice(overrides?: Partial<Invoice>): Invoice {
  return {
    paymentHash: '0x' + 'a'.repeat(64),
    invoiceAddress: 'fibt1000000001p...',
    amount: '0x5f5e100', // 1 CKB in shannons
    description: 'Test invoice',
    expiry: Math.floor(Date.now() / 1000) + 3600,
    createdAt: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

export function createMockPaymentSession(overrides?: Partial<PaymentSession>): PaymentSession {
  return {
    id: 'session-1',
    articleId: 'test-article-1',
    invoice: createMockInvoice(),
    status: 'pending',
    createdAt: Date.now(),
    ...overrides,
  };
}

export function createMockFiberNode() {
  return {
    newInvoice: vi.fn(),
    getPayment: vi.fn(),
    parseInvoice: vi.fn(),
  };
}

export function generateTestMacaroon(): string {
  // Return base64 encoded test macaroon
  return Buffer.from('test-macaroon-data').toString('base64');
}

export function generateTestPreimage(): string {
  // Return hex string
  return '0x' + 'b'.repeat(64);
}
