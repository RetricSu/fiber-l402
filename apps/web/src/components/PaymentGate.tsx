import { useState, useEffect, useCallback } from 'react';
import type { Article } from '@fiber-l402/types';
import { FiberRpcClient } from '@fiber-pay/sdk';
import { FIBER_STATE_CHANGE_EVENT } from './FiberConnectButton';

const FIBER_RPC_URL_KEY = 'fiber-user-rpc-url';
const FIBER_CONNECTED_KEY = 'fiber-user-rpc-connected';

interface PaymentGateProps {
  articleId: string;
  price: number;
}

interface PaymentChallenge {
  macaroon: string;
  invoice: string;
}

export function PaymentGate({ articleId, price }: PaymentGateProps) {
  const [challenge, setChallenge] = useState<PaymentChallenge | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [isFiberConnected, setIsFiberConnected] = useState(false);
  const [isAutoPaying, setIsAutoPaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [articleContent, setArticleContent] = useState<string | null>(null);

  // Sync connection state from header's FiberConnectButton via localStorage
  const syncConnectionState = useCallback(() => {
    const connected = localStorage.getItem(FIBER_CONNECTED_KEY) === 'true';
    setIsFiberConnected(connected);
  }, []);

  useEffect(() => {
    syncConnectionState();
    window.addEventListener(FIBER_STATE_CHANGE_EVENT, syncConnectionState);
    return () => window.removeEventListener(FIBER_STATE_CHANGE_EVENT, syncConnectionState);
  }, [syncConnectionState]);

  // Check cached credentials
  useEffect(() => {
    const checkCachedCredentials = async () => {
      setIsInitialLoading(true);
      try {
        const cached = localStorage.getItem(`l402-${articleId}`);
        if (cached) {
          const { macaroon, preimage } = JSON.parse(cached);
          await fetchContent(macaroon, preimage);
        }
      } catch {
        // Ignore cache errors
      } finally {
        setIsInitialLoading(false);
      }
    };
    checkCachedCredentials();
  }, [articleId]);

  const fetchContent = async (macaroon: string, preimage: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:3001/api/articles/${articleId}/content`, {
        headers: { 'Authorization': `L402 ${macaroon}:${preimage}` },
      });
      if (response.status === 402) {
        const data = await response.json();
        setChallenge({ macaroon: data.macaroon, invoice: data.invoice });
        setIsPaid(false);
        return;
      }
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
      const article = await response.json();
      setIsPaid(true);
      setArticleContent(article.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContentWithPaidInvoice = async (macaroon: string, paymentHash?: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:3001/api/articles/${articleId}/content`, {
        headers: {
          Authorization: `L402 ${macaroon}`,
          ...(paymentHash ? { 'X-L402-Payment-Hash': paymentHash } : {}),
        },
      });
      if (response.status === 402 || response.status === 401) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || `Payment not settled yet (${response.status})`);
      }
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
      const article = await response.json();
      setIsPaid(true);
      setArticleContent(article.content);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const initiatePayment = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:3001/api/articles/${articleId}/content`);
      if (response.status === 402) {
        const data = await response.json();
        setChallenge({ macaroon: data.macaroon, invoice: data.invoice });
      } else if (response.ok) {
        const article = await response.json();
        setIsPaid(true);
        setArticleContent(article.content);
      } else {
        throw new Error(`Unexpected response: ${response.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const checkPayment = async (preimage: string) => {
    if (!challenge) return;
    localStorage.setItem(`l402-${articleId}`, JSON.stringify({
      macaroon: challenge.macaroon,
      preimage,
    }));
    await fetchContent(challenge.macaroon, preimage);
  };

  const payWithConnectedNode = async () => {
    if (!challenge) return;
    const rpcUrl = localStorage.getItem(FIBER_RPC_URL_KEY)?.trim();
    if (!rpcUrl) {
      setError('No Fiber node connected. Use the Connect Node button in the header.');
      return;
    }

    setIsAutoPaying(true);
    setError(null);

    try {
      const client = new FiberRpcClient({ url: rpcUrl, timeout: 20000 });
      const paymentResult = await client.sendPayment({
        invoice: challenge.invoice,
        allow_self_payment: true,
      });

      const paymentHash = paymentResult.payment_hash;
      if (paymentResult.status === 'Failed') {
        throw new Error(paymentResult.failed_error || 'Payment failed');
      }

      let paymentSettled = paymentResult.status === 'Success';

      for (let attempt = 0; !paymentSettled && attempt < 30; attempt += 1) {
        const paymentInfo = await client.getPayment({ payment_hash: paymentHash });
        if (paymentInfo.status === 'Success') { paymentSettled = true; break; }
        if (paymentInfo.status === 'Failed') {
          throw new Error(paymentInfo.failed_error || 'Payment failed on connected node');
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (!paymentSettled) {
        throw new Error('Payment is still pending on your node. Please retry in a few seconds.');
      }

      for (let attempt = 0; attempt < 10; attempt += 1) {
        const unlocked = await fetchContentWithPaidInvoice(challenge.macaroon, paymentHash);
        if (unlocked) return;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      throw new Error('Payment submitted, but unlock confirmation timed out. Please retry.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pay with connected node');
    } finally {
      setIsAutoPaying(false);
    }
  };

  const copyInvoice = () => {
    if (!challenge) return;
    navigator.clipboard.writeText(challenge.invoice);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Render States ───

  // Initial loading: skeleton
  if (isInitialLoading) {
    return (
      <div className="rounded-2xl border border-border bg-surface-1 p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="h-5 w-48 animate-pulse rounded-lg bg-surface-3" />
          <div className="h-10 w-64 animate-pulse rounded-lg bg-surface-3" />
          <div className="h-4 w-36 animate-pulse rounded-lg bg-surface-3" />
        </div>
      </div>
    );
  }

  // Already paid
  if (isPaid) {
    return (
      <>
        <div className="flex items-center gap-3 rounded-2xl border border-success/20 bg-success/5 px-6 py-4">
          <svg className="h-5 w-5 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium text-success">Content unlocked</span>
        </div>
        {articleContent && (
          <div
            className="article-content mt-8 text-text-secondary leading-relaxed"
            dangerouslySetInnerHTML={{ __html: articleContent }}
          />
        )}
      </>
    );
  }

  // Challenge: Payment view
  if (challenge) {
    return (
      <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
        {/* Header */}
        <div className="border-b border-border bg-surface-2/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-text-primary">Complete Payment</h3>
            <span className="rounded-lg bg-accent/10 px-3 py-1 text-sm font-semibold text-accent">
              {price} CKB
            </span>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Auto-pay: prominent when connected */}
          {isFiberConnected && (
            <button
              onClick={payWithConnectedNode}
              disabled={isAutoPaying || isLoading}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-accent px-6 py-4 text-base font-semibold text-surface-0 transition-all duration-200 hover:bg-accent-hover hover:shadow-[0_0_24px_oklch(0.75_0.12_85/0.25)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isAutoPaying ? (
                <>
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-surface-0/30 border-t-surface-0" />
                  Paying with your node…
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                  Pay with Connected Node
                </>
              )}
            </button>
          )}

          {isFiberConnected && (
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-text-muted">or pay manually</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}

          {/* Invoice */}
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-text-muted">
              Invoice
            </label>
            <div className="relative">
              <code className="block max-h-24 overflow-y-auto rounded-xl border border-border bg-surface-2 p-4 font-mono text-xs leading-relaxed text-text-secondary break-all">
                {challenge.invoice}
              </code>
              <button
                onClick={copyInvoice}
                className="absolute right-2 top-2 rounded-lg bg-surface-3 px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-4 hover:text-text-primary cursor-pointer"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Manual preimage */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const input = form.elements.namedItem('preimage') as HTMLInputElement;
              checkPayment(input.value);
            }}
          >
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-text-muted">
              Payment Preimage
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="preimage"
                placeholder="0x..."
                required
                disabled={isLoading}
                className="flex-1 rounded-xl border border-border bg-surface-2 px-4 py-3 font-mono text-sm text-text-primary placeholder-text-muted transition-colors focus:border-accent focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-xl bg-surface-3 px-5 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-4 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? 'Verifying…' : 'Verify'}
              </button>
            </div>
            <p className="mt-2 text-xs text-text-muted">
              Pay the invoice with any Fiber wallet, then enter the preimage to unlock.
            </p>
          </form>

          {error && (
            <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default: Unlock prompt
  return (
    <div className="rounded-2xl border border-accent/20 bg-accent/5 p-8 text-center">
      <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
        <svg className="h-7 w-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-text-primary">Premium Content</h3>
      <p className="mb-5 text-sm text-text-secondary">
        Unlock this article for <strong className="text-accent">{price} CKB</strong>
      </p>
      <button
        onClick={initiatePayment}
        disabled={isLoading}
        className="inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-3.5 text-base font-semibold text-surface-0 transition-all duration-200 hover:bg-accent-hover hover:shadow-[0_0_24px_oklch(0.75_0.12_85/0.25)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isLoading ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-surface-0/30 border-t-surface-0" />
            Loading…
          </>
        ) : (
          <>
            Unlock for {price} CKB
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </>
        )}
      </button>
      {error && (
        <div className="mt-4 rounded-xl bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}
    </div>
  );
}
