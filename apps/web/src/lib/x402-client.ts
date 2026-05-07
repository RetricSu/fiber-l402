

export interface X402SupportedResponse {
  kinds: Array<{
    x402Version: number;
    scheme: string;
    network: string;
    extra?: Record<string, unknown>;
  }>;
  extensions: string[];
  signers: Record<string, string[]>;
}

export interface X402PaymentRequirements {
  scheme: string;
  network: string;
  asset: string;
  amount: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: Record<string, unknown>;
}

export interface X402ResourceInfo {
  url: string;
  description?: string;
  mimeType?: string;
}

export interface X402PaymentPayload {
  x402Version: number;
  resource?: X402ResourceInfo;
  accepted: X402PaymentRequirements;
  payload: Record<string, unknown>;
  extensions?: Record<string, unknown>;
}

export interface X402VerifyRequest {
  x402Version: number;
  paymentPayload: X402PaymentPayload;
  paymentRequirements: X402PaymentRequirements;
}

export interface X402VerifyResponse {
  isValid: boolean;
  invalidReason?: string;
  invalidMessage?: string;
  payer?: string;
  extensions?: Record<string, unknown>;
}

export interface X402SettleRequest {
  x402Version: number;
  paymentPayload: X402PaymentPayload;
  paymentRequirements: X402PaymentRequirements;
}

export interface X402SettleResponse {
  success: boolean;
  errorReason?: string;
  errorMessage?: string;
  payer?: string;
  transaction: string;
  network: string;
  amount?: string;
  extensions?: Record<string, unknown>;
}

export class X402Client {
  private readonly nodeUrl: string;

  constructor(nodeUrl: string) {
    this.nodeUrl = nodeUrl.replace(/\/$/, '');
  }

  async supported(): Promise<X402SupportedResponse> {
    const response = await fetch(`${this.nodeUrl}/supported`);
    if (!response.ok) {
      throw new Error(`Failed to fetch supported: ${response.status}`);
    }
    return response.json();
  }

  async verify(request: X402VerifyRequest): Promise<X402VerifyResponse> {
    const response = await fetch(`${this.nodeUrl}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error(`Failed to verify: ${response.status}`);
    }
    return response.json();
  }

  async settle(request: X402SettleRequest): Promise<X402SettleResponse> {
    const response = await fetch(`${this.nodeUrl}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error(`Failed to settle: ${response.status}`);
    }
    return response.json();
  }

  buildRequirements(
    payTo: string,
    amount: string,
    network: string = 'fiber:testnet',
    asset: string = 'ckb',
  ): X402PaymentRequirements {
    return {
      scheme: 'exact',
      network,
      asset,
      amount,
      payTo,
      maxTimeoutSeconds: 300,
      extra: {},
    };
  }

  buildPayload(
    invoice: string,
    paymentPreimage: string,
    requirements: X402PaymentRequirements,
    resourceUrl?: string,
  ): X402PaymentPayload {
    return {
      x402Version: 2,
      resource: resourceUrl ? { url: resourceUrl } : undefined,
      accepted: requirements,
      payload: {
        invoice,
        paymentPreimage,
      },
      extensions: {},
    };
  }
}

export function getContentId(articleId: string): string {
  return `article:${articleId}`;
}

export function getX402CacheKey(articleId: string): string {
  return `x402-${articleId}`;
}

export function getCachedX402Credentials(articleId: string): { invoice: string; paymentPreimage: string } | null {
  if (typeof window === 'undefined') return null;
  const cached = localStorage.getItem(getX402CacheKey(articleId));
  return cached ? JSON.parse(cached) : null;
}

export function cacheX402Credentials(articleId: string, invoice: string, paymentPreimage: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getX402CacheKey(articleId), JSON.stringify({ invoice, paymentPreimage }));
}

export function clearX402Credentials(articleId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(getX402CacheKey(articleId));
}
