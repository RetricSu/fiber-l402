import { useState, useEffect, useCallback } from 'react';
import type { Article } from '@fiber-l402/types';

interface PaymentGateProps {
  articleId: string;
  price: number;
  onUnlock: (content: Article) => void;
}

interface PaymentChallenge {
  macaroon: string;
  invoice: string;
}

export function PaymentGate({ articleId, price, onUnlock }: PaymentGateProps) {
  const [challenge, setChallenge] = useState<PaymentChallenge | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);

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

  // Initial loading state (checking cache)
  if (isInitialLoading) {
    return (
      <div className="payment-gate loading">
        <div className="loading-spinner" />
        <p>Checking payment status...</p>
      </div>
    );
  }

  if (isPaid) {
    return <div className="payment-success">✓ Content Unlocked</div>;
  }

  if (challenge) {
    return (
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
        
        {error && <div className="error">{error}</div>}
      </div>
    );
  }

  return (
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
  );
}
