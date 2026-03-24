import { useState, useEffect } from 'react';
import type { Article } from '@fiber-l402/types';
import { FiberRpcClient } from '@fiber-pay/sdk';

interface PaymentGateProps {
  articleId: string;
  price: number;
  onUnlock: (content: Article) => void;
}

interface PaymentChallenge {
  macaroon: string;
  invoice: string;
}

interface FiberNodeSummary {
  nodeId: string;
  chainHash: string;
}

const FIBER_RPC_URL_KEY = 'fiber-user-rpc-url';
const FIBER_CONNECTED_KEY = 'fiber-user-rpc-connected';

export function PaymentGate({ articleId, price, onUnlock }: PaymentGateProps) {
  const [challenge, setChallenge] = useState<PaymentChallenge | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [fiberRpcUrl, setFiberRpcUrl] = useState('http://127.0.0.1:8229');
  const [isFiberConnected, setIsFiberConnected] = useState(false);
  const [isFiberConnecting, setIsFiberConnecting] = useState(false);
  const [fiberConnectError, setFiberConnectError] = useState<string | null>(null);
  const [fiberNode, setFiberNode] = useState<FiberNodeSummary | null>(null);
  const [isAutoPaying, setIsAutoPaying] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const savedUrl = localStorage.getItem(FIBER_RPC_URL_KEY);
    const savedConnected = localStorage.getItem(FIBER_CONNECTED_KEY);

    if (savedUrl) {
      setFiberRpcUrl(savedUrl);
    }

    setIsFiberConnected(savedConnected === 'true');
  }, []);

  // Check if we have cached credentials
  useEffect(() => {
    const checkCachedCredentials = async () => {
      setIsInitialLoading(true);
      try {
        const cached = localStorage.getItem(`l402-${articleId}`);
        if (cached) {
          const { macaroon, preimage } = JSON.parse(cached);
          await fetchContent(macaroon, preimage);
        }
      } catch (e) {
        // Ignore cache errors, will show payment gate
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
        headers: {
          'Authorization': `L402 ${macaroon}:${preimage}`,
        },
      });

      if (response.status === 402) {
        // Need new challenge
        const data = await response.json();
        setChallenge({ macaroon: data.macaroon, invoice: data.invoice });
        setIsPaid(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const article = await response.json();
      setIsPaid(true);
      onUnlock(article);
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

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const article = await response.json();
      setIsPaid(true);
      onUnlock(article);
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
      // First try to get content (may return 402 with challenge)
      const response = await fetch(`http://localhost:3001/api/articles/${articleId}/content`);
      
      if (response.status === 402) {
        const data = await response.json();
        setChallenge({ macaroon: data.macaroon, invoice: data.invoice });
      } else if (response.ok) {
        // Already have access
        const article = await response.json();
        setIsPaid(true);
        onUnlock(article);
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
    
    // Cache credentials
    localStorage.setItem(`l402-${articleId}`, JSON.stringify({
      macaroon: challenge.macaroon,
      preimage,
    }));

    await fetchContent(challenge.macaroon, preimage);
  };

  const payWithConnectedNode = async () => {
    if (!challenge) {
      return;
    }

    const trimmedUrl = fiberRpcUrl.trim();
    if (!trimmedUrl) {
      setError('Missing Fiber RPC URL. Connect your node first.');
      return;
    }

    setIsAutoPaying(true);
    setError(null);

    try {
      const client = new FiberRpcClient({
        url: trimmedUrl,
        timeout: 20000,
      });

      const paymentResult = await client.sendPayment({
        invoice: challenge.invoice,
        allow_self_payment: true,
      });

      const paymentHash = paymentResult.payment_hash;

      if (paymentResult.status === 'Failed') {
        throw new Error(paymentResult.failed_error || 'Payment failed');
      }

      let paymentSettled = paymentResult.status === 'Success';

      // Poll payer node until payment settles or fails.
      for (let attempt = 0; !paymentSettled && attempt < 30; attempt += 1) {
        const paymentInfo = await client.getPayment({ payment_hash: paymentHash });
        if (paymentInfo.status === 'Success') {
          paymentSettled = true;
          break;
        }
        if (paymentInfo.status === 'Failed') {
          throw new Error(paymentInfo.failed_error || 'Payment failed on connected node');
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (!paymentSettled) {
        throw new Error('Payment is still pending on your node. Please retry in a few seconds.');
      }

      // Wait for settlement to propagate on receiver side before trying unlock.
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const unlocked = await fetchContentWithPaidInvoice(challenge.macaroon, paymentHash);
        if (unlocked) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      throw new Error('Payment submitted, but unlock confirmation timed out. Please retry.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pay with connected node');
    } finally {
      setIsAutoPaying(false);
    }
  };

  const connectFiberNode = async () => {
    const trimmedUrl = fiberRpcUrl.trim();
    if (!trimmedUrl) {
      setFiberConnectError('Please enter a Fiber RPC URL.');
      return;
    }

    setIsFiberConnecting(true);
    setFiberConnectError(null);

    try {
      const client = new FiberRpcClient({
        url: trimmedUrl,
        timeout: 8000,
      });

      const info = await client.nodeInfo();

      setFiberNode({
        nodeId: info.node_id,
        chainHash: info.chain_hash,
      });
      setIsFiberConnected(true);
      setIsConnectModalOpen(false);

      if (typeof window !== 'undefined') {
        localStorage.setItem(FIBER_RPC_URL_KEY, trimmedUrl);
        localStorage.setItem(FIBER_CONNECTED_KEY, 'true');
      }
    } catch (err) {
      setFiberNode(null);
      setIsFiberConnected(false);
      setFiberConnectError(err instanceof Error ? err.message : 'Failed to connect to Fiber RPC endpoint.');
      if (typeof window !== 'undefined') {
        localStorage.setItem(FIBER_RPC_URL_KEY, trimmedUrl);
        localStorage.setItem(FIBER_CONNECTED_KEY, 'false');
      }
    } finally {
      setIsFiberConnecting(false);
    }
  };

  const disconnectFiberNode = () => {
    setIsFiberConnected(false);
    setFiberNode(null);
    setFiberConnectError(null);
    if (typeof window !== 'undefined') {
      localStorage.setItem(FIBER_CONNECTED_KEY, 'false');
    }
  };

  const renderFiberConnectionPanel = () => (
    <div className="fiber-connect-panel">
      <div className="fiber-connect-status">
        <span className={`status-dot ${isFiberConnected ? 'connected' : 'disconnected'}`} />
        <span>
          {isFiberConnected ? 'Fiber node connected' : 'Fiber node not connected'}
        </span>
      </div>

      {fiberNode && (
        <div className="fiber-node-meta">
          <div>
            <strong>Node:</strong> {fiberNode.nodeId.slice(0, 18)}...
          </div>
          <div>
            <strong>Chain:</strong> {fiberNode.chainHash.slice(0, 14)}...
          </div>
        </div>
      )}

      <div className="fiber-connect-actions">
        <button
          type="button"
          className="fiber-connect-btn"
          onClick={() => {
            setFiberConnectError(null);
            setIsConnectModalOpen(true);
          }}
        >
          {isFiberConnected ? 'Switch Node' : 'Connect Fiber Node'}
        </button>
        {isFiberConnected && (
          <button
            type="button"
            className="fiber-disconnect-btn"
            onClick={disconnectFiberNode}
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );

  const renderFiberConnectModal = () => {
    if (!isConnectModalOpen) {
      return null;
    }

    return (
      <div className="fiber-modal-overlay" onClick={() => setIsConnectModalOpen(false)}>
        <div className="fiber-modal" onClick={(e) => e.stopPropagation()}>
          <h4>Connect Your Fiber Node</h4>
          <p className="fiber-modal-hint">
            Enter your Fiber node RPC URL. We will call nodeInfo via fiber-pay SDK.
          </p>

          <input
            type="url"
            value={fiberRpcUrl}
            onChange={(e) => setFiberRpcUrl(e.target.value)}
            placeholder="http://127.0.0.1:8229"
            className="fiber-rpc-input"
            disabled={isFiberConnecting}
          />

          {fiberConnectError && <div className="error">{fiberConnectError}</div>}

          <div className="fiber-modal-actions">
            <button
              type="button"
              className="fiber-modal-cancel"
              onClick={() => setIsConnectModalOpen(false)}
              disabled={isFiberConnecting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="fiber-modal-connect"
              onClick={connectFiberNode}
              disabled={isFiberConnecting}
            >
              {isFiberConnecting ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Initial loading state (checking cache)
  if (isInitialLoading) {
    return (
      <>
        <div className="payment-gate loading">
          <div className="loading-spinner" />
          <p>Checking payment status...</p>
        </div>
        {renderFiberConnectionPanel()}
        {renderFiberConnectModal()}
      </>
    );
  }

  if (isPaid) {
    return (
      <>
        <div className="payment-success">✓ Content Unlocked</div>
        {renderFiberConnectionPanel()}
        {renderFiberConnectModal()}
      </>
    );
  }

  if (challenge) {
    return (
      <>
        <div className="payment-challenge">
          <h3>Complete Payment</h3>
          <p>Price: {price} CKB</p>

          <div className="invoice-section">
            <label>Invoice Address:</label>
            <code className="invoice-address">{challenge.invoice}</code>
            <button
              onClick={() => navigator.clipboard.writeText(challenge.invoice)}
              className="copy-btn"
              disabled={isLoading}
            >
              Copy
            </button>
          </div>

          <p className="instructions">
            1. Copy the invoice address above<br/>
            2. Pay using your Fiber wallet<br/>
            3. Enter the payment preimage below
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const input = form.elements.namedItem('preimage') as HTMLInputElement;
              checkPayment(input.value);
            }}
          >
            <input
              type="text"
              name="preimage"
              placeholder="Enter payment preimage (0x...)"
              className="preimage-input"
              required
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading} className="verify-btn">
              {isLoading ? (
                <>
                  <span className="spinner-small" />
                  Verifying...
                </>
              ) : 'Verify Payment'}
            </button>
          </form>

          {isFiberConnected && (
            <button
              type="button"
              className="verify-btn auto-pay-btn"
              disabled={isAutoPaying || isLoading}
              onClick={payWithConnectedNode}
            >
              {isAutoPaying ? 'Paying with your node...' : 'Pay With Connected Node'}
            </button>
          )}

          {error && <div className="error">{error}</div>}
        </div>
        {renderFiberConnectionPanel()}
        {renderFiberConnectModal()}
      </>
    );
  }

  return (
    <>
      <div className="payment-gate">
        <p>This content requires payment</p>
        <button onClick={initiatePayment} disabled={isLoading} className="pay-btn">
          {isLoading ? (
            <>
              <span className="spinner-small" />
              Loading...
            </>
          ) : `Unlock for ${price} CKB`}
        </button>
        {error && <div className="error">{error}</div>}
      </div>

      {renderFiberConnectionPanel()}
      {renderFiberConnectModal()}
    </>
  );
}
