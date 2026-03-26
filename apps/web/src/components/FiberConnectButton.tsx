import { useState, useEffect, useCallback } from 'react';
import { FiberRpcClient } from '@fiber-pay/sdk';

const FIBER_RPC_URL_KEY = 'fiber-user-rpc-url';
const FIBER_CONNECTED_KEY = 'fiber-user-rpc-connected';
export const FIBER_STATE_CHANGE_EVENT = 'fiber-connection-state-change';

interface FiberNodeSummary {
  nodeId: string;
  chainHash: string;
}

export function FiberConnectButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rpcUrl, setRpcUrl] = useState('http://127.0.0.1:8229');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [node, setNode] = useState<FiberNodeSummary | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const savedUrl = localStorage.getItem(FIBER_RPC_URL_KEY);
    const savedConnected = localStorage.getItem(FIBER_CONNECTED_KEY);
    if (savedUrl) setRpcUrl(savedUrl);
    if (savedConnected === 'true') {
      setIsConnected(true);
      // Re-validate connection on mount
      if (savedUrl) {
        const client = new FiberRpcClient({ url: savedUrl, timeout: 5000 });
        client.nodeInfo().then((info) => {
          setNode({ nodeId: info.node_id, chainHash: info.chain_hash });
        }).catch(() => {
          setIsConnected(false);
          localStorage.setItem(FIBER_CONNECTED_KEY, 'false');
          window.dispatchEvent(new CustomEvent(FIBER_STATE_CHANGE_EVENT));
        });
      }
    }
  }, []);

  const connect = useCallback(async () => {
    const url = rpcUrl.trim();
    if (!url) {
      setConnectError('Please enter a Fiber RPC URL');
      return;
    }

    setIsConnecting(true);
    setConnectError(null);

    try {
      const client = new FiberRpcClient({ url, timeout: 8000 });
      const info = await client.nodeInfo();
      setNode({ nodeId: info.node_id, chainHash: info.chain_hash });
      setIsConnected(true);
      setIsModalOpen(false);
      setShowDropdown(false);
      localStorage.setItem(FIBER_RPC_URL_KEY, url);
      localStorage.setItem(FIBER_CONNECTED_KEY, 'true');
      window.dispatchEvent(new CustomEvent(FIBER_STATE_CHANGE_EVENT));
    } catch (err) {
      setNode(null);
      setIsConnected(false);
      setConnectError(err instanceof Error ? err.message : 'Connection failed');
      localStorage.setItem(FIBER_CONNECTED_KEY, 'false');
      window.dispatchEvent(new CustomEvent(FIBER_STATE_CHANGE_EVENT));
    } finally {
      setIsConnecting(false);
    }
  }, [rpcUrl]);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setNode(null);
    setShowDropdown(false);
    localStorage.setItem(FIBER_CONNECTED_KEY, 'false');
    window.dispatchEvent(new CustomEvent(FIBER_STATE_CHANGE_EVENT));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-fiber-dropdown]')) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showDropdown]);

  return (
    <>
      {/* Button in header */}
      {isConnected ? (
        <div className="relative" data-fiber-dropdown>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm font-medium text-text-primary transition-colors duration-150 hover:bg-surface-3 cursor-pointer"
          >
            <span className="h-2 w-2 rounded-full bg-success" />
            <span className="hidden sm:inline">
              {node ? `${node.nodeId.slice(0, 8)}…${node.nodeId.slice(-4)}` : 'Connected'}
            </span>
            <span className="sm:hidden">Node</span>
            <svg className="h-3.5 w-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-border bg-surface-1 p-4 shadow-2xl z-50">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                Connected Node
              </div>
              {node && (
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted">ID:</span>
                    <code className="truncate rounded bg-surface-3 px-1.5 py-0.5 font-mono text-xs text-text-secondary">
                      {node.nodeId.slice(0, 20)}…
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted">Chain:</span>
                    <code className="truncate rounded bg-surface-3 px-1.5 py-0.5 font-mono text-xs text-text-secondary">
                      {node.chainHash.slice(0, 16)}…
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted">RPC:</span>
                    <code className="truncate rounded bg-surface-3 px-1.5 py-0.5 font-mono text-xs text-text-secondary">
                      {rpcUrl}
                    </code>
                  </div>
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => { setShowDropdown(false); setIsModalOpen(true); setConnectError(null); }}
                  className="flex-1 rounded-lg bg-surface-3 px-3 py-2 text-sm font-medium text-text-primary transition-colors duration-150 hover:bg-surface-4 cursor-pointer"
                >
                  Switch Node
                </button>
                <button
                  onClick={disconnect}
                  className="rounded-lg bg-error/15 px-3 py-2 text-sm font-medium text-error transition-colors duration-150 hover:bg-error/25 cursor-pointer"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => { setIsModalOpen(true); setConnectError(null); }}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-accent-hover hover:shadow-lg cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Connect Node
        </button>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-999 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-surface-1 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'modalIn 250ms var(--ease-out-expo)' }}
          >
            <h3 className="mb-1 text-lg font-semibold text-text-primary">
              Connect Fiber Node
            </h3>
            <p className="mb-5 text-sm text-text-muted">
              Enter your Fiber node RPC endpoint to enable direct payments.
            </p>

            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">
              RPC URL
            </label>
            <input
              type="url"
              value={rpcUrl}
              onChange={(e) => setRpcUrl(e.target.value)}
              placeholder="http://127.0.0.1:8229"
              disabled={isConnecting}
              onKeyDown={(e) => e.key === 'Enter' && connect()}
              className="w-full rounded-lg border border-border bg-surface-2 px-4 py-3 font-mono text-sm text-text-primary placeholder-text-muted transition-colors duration-150 focus:border-accent focus:outline-none disabled:opacity-50"
            />

            {connectError && (
              <div className="mt-3 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
                {connectError}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isConnecting}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors duration-150 hover:bg-surface-3 hover:text-text-primary disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={connect}
                disabled={isConnecting}
                className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-accent-hover disabled:opacity-50 cursor-pointer"
              >
                {isConnecting ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Connecting…
                  </>
                ) : (
                  'Connect'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  );
}
