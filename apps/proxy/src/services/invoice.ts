import type { Invoice } from '@fiber-l402/types';
import { FiberRpcClient, type CkbInvoice, type HashAlgorithm } from '@fiber-pay/sdk';

export interface InvoiceServiceConfig {
  rpcUrl: string;
  biscuitToken?: string;
  defaultExpirySeconds: number;
}

export interface CreateInvoiceParams {
  amount: string; // In shannons (hex string like "0x5f5e100" for 1 CKB)
  description?: string;
  currency: 'Fibb' | 'Fibt' | 'Fibd'; // mainnet, testnet, dev
  expirySeconds?: number;
}

export class InvoiceService {
  private config: InvoiceServiceConfig;
  private client: FiberRpcClient;

  constructor(config: Partial<InvoiceServiceConfig> = {}) {
    this.config = {
      rpcUrl: config.rpcUrl || process.env.FIBER_RPC_URL || 'http://127.0.0.1:8227',
      biscuitToken: config.biscuitToken || process.env.FIBER_BISCUIT_TOKEN,
      defaultExpirySeconds: config.defaultExpirySeconds || 3600,
    };

    this.client = new FiberRpcClient({
      url: this.config.rpcUrl,
      biscuitToken: this.config.biscuitToken,
    });
  }

  async createInvoice(params: CreateInvoiceParams): Promise<Invoice> {
    const response = await this.client.newInvoice({
      amount: params.amount as `0x${string}`,
      description: params.description || 'L402 Payment',
      currency: params.currency,
      expiry: `0x${(params.expirySeconds || this.config.defaultExpirySeconds).toString(16)}`,
      hash_algorithm: 'Sha256' as HashAlgorithm,
    });

    const paymentHash = response.invoice.data.payment_hash;
    const description =
      this.getInvoiceAttr(response.invoice, 'Description') ||
      this.getInvoiceAttr(response.invoice, 'description') ||
      params.description ||
      'L402 Payment';
    const expiryHex =
      this.getInvoiceAttr(response.invoice, 'ExpiryTime') ||
      this.getInvoiceAttr(response.invoice, 'expiry_time') ||
      `0x${this.config.defaultExpirySeconds.toString(16)}`;
    const timestampHex = response.invoice.data.timestamp || `0x${Math.floor(Date.now() / 1000).toString(16)}`;

    if (!paymentHash) {
      throw new Error('RPC response missing payment hash');
    }

    return {
      paymentHash,
      invoiceAddress: response.invoice_address,
      amount: response.invoice.amount || params.amount,
      description,
      expiry: parseInt(expiryHex, 16),
      createdAt: parseInt(timestampHex, 16),
    };
  }

  async getPaymentStatus(paymentHash: string): Promise<'pending' | 'success' | 'failed'> {
    try {
      const response = await this.client.getPayment({ payment_hash: paymentHash as `0x${string}` });

      switch (response.status) {
        case 'Success':
          return 'success';
        case 'Failed':
          return 'failed';
        case 'Created':
        case 'Inflight':
        default:
          return 'pending';
      }
    } catch (error) {
      // If payment not found, it's still pending
      return 'pending';
    }
  }

  async getInvoiceStatus(paymentHash: string): Promise<'Open' | 'Cancelled' | 'Expired' | 'Received' | 'Paid' | 'Unknown'> {
    try {
      const response = await this.client.getInvoice({ payment_hash: paymentHash as `0x${string}` });
      return response.status;
    } catch {
      return 'Unknown';
    }
  }

  async parseInvoiceAddress(address: string): Promise<{ paymentHash: string; amount: string; expiry: number }> {
    // Quick format guard before calling SDK parser.
    if (!address.startsWith('fib') || address.length < 20) {
      throw new Error('Invalid invoice address format');
    }

    const parsed = await this.client.parseInvoice({ invoice: address });
    const paymentHash = parsed.invoice.data.payment_hash;
    const amount = parsed.invoice.amount || '0x0';
    const expiryHex =
      this.getInvoiceAttr(parsed.invoice, 'ExpiryTime') ||
      this.getInvoiceAttr(parsed.invoice, 'expiry_time') ||
      '0x0';

    return {
      paymentHash,
      amount,
      expiry: parseInt(expiryHex, 16),
    };
  }

  private getInvoiceAttr(invoice: CkbInvoice, key: string): string | undefined {
    const attrs = invoice.data?.attrs;
    if (!attrs || attrs.length === 0) {
      return undefined;
    }

    for (const attr of attrs) {
      const value = (attr as Record<string, unknown>)[key];
      if (typeof value === 'string') {
        return value;
      }
    }

    return undefined;
  }
}
