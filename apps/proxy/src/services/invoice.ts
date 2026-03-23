import type { Invoice } from '@fiber-l402/types';

// We'll use direct RPC since SDK is ESM and proxy is CommonJS for now
// Or we can use dynamic import for the SDK
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

export interface FiberInvoiceResponse {
  invoice_address: string;
  invoice: {
    payment_hash: string;
    amount: string;
    currency: string;
    description: string;
    expiry: string;
    timestamp: string;
    payment_preimage?: string;
    payment_preimage_hash?: string;
    hash_algorithm: 'sha256' | 'ckb_hash';
    udt_script?: string | null;
    signature?: string;
  };
}

export class InvoiceService {
  private config: InvoiceServiceConfig;

  constructor(config: Partial<InvoiceServiceConfig> = {}) {
    this.config = {
      rpcUrl: config.rpcUrl || process.env.FIBER_RPC_URL || 'http://127.0.0.1:8227',
      biscuitToken: config.biscuitToken || process.env.FIBER_BISCUIT_TOKEN,
      defaultExpirySeconds: config.defaultExpirySeconds || 3600,
    };
  }

  async createInvoice(params: CreateInvoiceParams): Promise<Invoice> {
    const response = await this.rpcCall<FiberInvoiceResponse>('new_invoice', {
      amount: params.amount,
      description: params.description || 'L402 Payment',
      currency: params.currency,
      expiry: `0x${(params.expirySeconds || this.config.defaultExpirySeconds).toString(16)}`,
      hash_algorithm: 'sha256',
    });

    return {
      paymentHash: response.invoice.payment_hash,
      invoiceAddress: response.invoice_address,
      amount: response.invoice.amount,
      description: response.invoice.description,
      expiry: parseInt(response.invoice.expiry, 16),
      createdAt: parseInt(response.invoice.timestamp, 16),
    };
  }

  async getPaymentStatus(paymentHash: string): Promise<'pending' | 'success' | 'failed'> {
    try {
      const response = await this.rpcCall<{
        payment_hash: string;
        status: 'Created' | 'Inflight' | 'Success' | 'Failed';
      }>('get_payment', {
        payment_hash: paymentHash,
      });

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

  parseInvoiceAddress(address: string): { paymentHash: string; amount: string; expiry: number } {
    // Fiber invoice format: fibt1000000001p...
    // This is a simplified parser - in production, use proper bech32 decoding
    if (!address.startsWith('fib') || address.length < 20) {
      throw new Error('Invalid invoice address format');
    }

    // For now, return placeholder - actual parsing requires bech32 library
    // This will be called after getting the invoice from createInvoice
    return {
      paymentHash: '', // Will be filled from createInvoice response
      amount: '',
      expiry: 0,
    };
  }

  private async rpcCall<T>(method: string, params: unknown): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.biscuitToken) {
      headers['Authorization'] = `Bearer ${this.config.biscuitToken}`;
    }

    const response = await fetch(this.config.rpcUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id: Date.now(),
      }),
    });

    if (!response.ok) {
      throw new Error(`RPC call failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      result?: T;
      error?: { code: number; message: string };
    };

    if (data.error) {
      throw new Error(`RPC error: ${data.error.message}`);
    }

    return data.result as T;
  }
}
