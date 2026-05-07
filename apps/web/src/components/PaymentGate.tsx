import { useState, useEffect, useCallback, useMemo } from 'react';
import { marked } from 'marked';
import { FIBER_STATE_CHANGE_EVENT } from './FiberConnectButton';
import { siteConfig } from '../config';
import { FiberRpcBrowserClient } from '../lib/fiber-rpc-browser';
import {
  X402Client,
  getCachedX402Credentials,
  cacheX402Credentials,
  clearX402Credentials,
} from '../lib/x402-client';

const FIBER_RPC_URL_KEY = 'fiber-user-rpc-url';
const FIBER_CONNECTED_KEY = 'fiber-user-rpc-connected';

interface PaymentGateProps {
  articleId: string;
  price: number;
  content: string;
  payTo: string;
}

interface PaymentChallenge {
  invoice: string;
  paymentHash: string;
}

export function PaymentGate({ articleId, price, content, payTo }: PaymentGateProps) {
  const [challenge, setChallenge] = useState<PaymentChallenge | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [isFiberConnected, setIsFiberConnected] = useState(false);
  const [isAutoPaying, setIsAutoPaying] = useState(false);
  const [copied, setCopied] = useState(false);

  const syncConnectionState = useCallback(() => {
    const connected = localStorage.getItem(FIBER_CONNECTED_KEY) === 'true';
    setIsFiberConnected(connected);
  }, []);

  useEffect(() => {
    syncConnectionState();
    window.addEventListener(FIBER_STATE_CHANGE_EVENT, syncConnectionState);
    return () => window.removeEventListener(FIBER_STATE_CHANGE_EVENT, syncConnectionState);
  }, [syncConnectionState]);

  useEffect(() => {
    const checkCache = async () => {
      setIsInitialLoading(true);
      try {
        const cachedContent = localStorage.getItem(`l402-content-${articleId}`);
        if (cachedContent) {
          setIsPaid(true);
          setIsInitialLoading(false);
          return;
        }

        const cached = getCachedX402Credentials(articleId);
        if (cached) {
          const verified = await verifyPayment(cached.invoice, cached.paymentPreimage);
          if (verified) {
            setIsPaid(true);
            localStorage.setItem(`l402-content-${articleId}`, content);
          }
        }
      } catch {
      } finally {
        setIsInitialLoading(false);
      }
    };
    checkCache();
  }, [articleId, content]);

  const verifyPayment = async (invoice: string, paymentPreimage: string): Promise<boolean> => {
    const rpcUrl = localStorage.getItem(FIBER_RPC_URL_KEY)?.trim();
    if (!rpcUrl) return false;

    try {
      const client = new X402Client(rpcUrl);
      const requirements = client.buildRequirements(
        payTo,
        (price * 100_000_000).toString(),
      );
      const payload = client.buildPayload(invoice, paymentPreimage, requirements);

      const response = await client.verify({
        x402Version: 2,
        paymentPayload: payload,
        paymentRequirements: requirements,
      });

      return response.isValid;
    } catch {
      return false;
    }
  };

  const initiatePayment = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rpcUrl = localStorage.getItem(FIBER_RPC_URL_KEY)?.trim();
      if (!rpcUrl) {
        throw new Error('Please connect your Fiber node first');
      }

      const fiberClient = new FiberRpcBrowserClient(rpcUrl);
      const amount = (price * 100_000_000).toString();

      const invoiceResult = await fiberClient.newInvoice({
        amount,
        description: `Article: ${articleId}`,
        currency: 'Fibt',
      });

      if (!invoiceResult.invoice) {
        throw new Error('Failed to generate invoice');
      }

      setChallenge({
        invoice: invoiceResult.invoice,
        paymentHash: invoiceResult.payment_hash,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate payment');
    } finally {
      setIsLoading(false);
    }
  };

  const payWithConnectedNode = async () => {
    if (!challenge) return;
    const rpcUrl = localStorage.getItem(FIBER_RPC_URL_KEY)?.trim();
    if (!rpcUrl) {
      setError('No Fiber node connected');
      return;
    }

    setIsAutoPaying(true);
    setError(null);

    try {
      const client = new FiberRpcBrowserClient(rpcUrl);
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
          throw new Error(paymentInfo.failed_error || 'Payment failed');
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (!paymentSettled) {
        throw new Error('Payment is still pending');
      }

      const payment = await client.getPayment({ payment_hash: paymentHash });
      if (!payment.payment_preimage) {
        throw new Error('Payment succeeded but no preimage found');
      }

      const verified = await verifyPayment(challenge.invoice, payment.payment_preimage);
      if (verified) {
        setIsPaid(true);
        cacheX402Credentials(articleId, challenge.invoice, payment.payment_preimage);
        localStorage.setItem(`l402-content-${articleId}`, content);
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pay with connected node');
    } finally {
      setIsAutoPaying(false);
    }
  };

  const checkPayment = async (preimage: string) => {
    if (!challenge) return;
    const verified = await verifyPayment(challenge.invoice, preimage);
    if (verified) {
      setIsPaid(true);
      cacheX402Credentials(articleId, challenge.invoice, preimage);
      localStorage.setItem(`l402-content-${articleId}`, content);
    } else {
      setError('Invalid payment preimage');
    }
  };

  const copyInvoice = () => {
    if (!challenge) return;
    navigator.clipboard.writeText(challenge.invoice);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderedHtml = useMemo(() => {
    return marked.parse(content, { async: false }) as string;
  }, [content]);

  if (isInitialLoading) {
    return (
      <div className="py-8">
        <div className="flex flex-col gap-4">
          <div className="h-4 w-3/4 animate-pulse rounded-lg bg-surface-3" />
          <div className="h-4 w-1/2 animate-pulse rounded-lg bg-surface-3" />
          <div className="h-4 w-2/3 animate-pulse rounded-lg bg-surface-3" />
        </div>
      </div>
    );
  }

  if (isPaid) {
    return (
      <>
        {renderedHtml && (
          <div
            className="article-content"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}
        <div className="mt-16 border-t border-border pt-8">
          <a
            href="/articles"
            className="inline-flex items-center gap-2 text-sm text-text-muted no-underline transition-colors hover:text-accent"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to archive
          </a>
        </div>
      </>
    );
  }

  if (challenge) {
    return (
      <div className="mt-4">
        <div className="paywall-fade h-24" />

        <div className="relative rounded-2xl border border-border bg-surface-1 overflow-hidden shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-text-primary">Continue Reading</h3>
              <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent">
                {price} CKB
              </span>
            </div>
            <p className="mt-1 text-sm text-text-muted">
              Pay once to unlock the full article. No account needed.
            </p>
          </div>

          <div className="p-6 space-y-5">
            {isFiberConnected && (
              <button
                onClick={payWithConnectedNode}
                disabled={isAutoPaying || isLoading}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-accent px-6 py-4 text-base font-semibold text-white transition-all duration-200 hover:bg-accent-hover hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isAutoPaying ? (
                  <>
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Paying with your node...
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
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

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
                  {isLoading ? 'Verifying...' : 'Verify'}
                </button>
              </div>
              <p className="mt-2 text-xs text-text-muted">
                Pay the invoice with any Fiber wallet, then enter the preimage to unlock.
              </p>
            </form>

            {error && (
              <div className="rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-sm text-error">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="paywall-fade h-24" />

      <div className="relative -mt-8 rounded-2xl border border-border bg-surface-1 p-8 text-center shadow-sm">
        <h3 className="mb-2 text-lg font-semibold text-text-primary">Continue Reading</h3>
        <p className="mb-5 text-sm text-text-muted">
          Unlock the full article for <strong className="text-accent">{price} CKB</strong>
          <span className="block mt-1 text-xs">No account required — pay once, read forever.</span>
        </p>
        <button
          onClick={initiatePayment}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-3.5 text-base font-semibold text-white transition-all duration-200 hover:bg-accent-hover hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Loading...
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
          <div className="mt-4 rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
