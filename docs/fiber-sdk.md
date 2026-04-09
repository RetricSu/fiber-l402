# Fiber SDK Documentation

## SDK Status

| Property | Value |
|----------|-------|
| Package | `@fiber-pay/sdk@0.2.0` |
| Status | **AVAILABLE** |
| Module Type | ESM (type: "module") |
| Install | `pnpm add @fiber-pay/sdk` |
| Target Fiber Version | v0.8.0 |
| Node.js Requirement | >= 20 |

## Installation

```bash
pnpm add @fiber-pay/sdk
```

**Note**: The SDK is an ES Module. Use `import` syntax, not `require()`.

## SDK API

### Main Client

#### `FiberRpcClient`

Primary class for interacting with Fiber Network nodes.

```typescript
import { FiberRpcClient } from '@fiber-pay/sdk';

const client = new FiberRpcClient({
  url: 'http://127.0.0.1:8229',
  biscuitToken: process.env.FIBER_RPC_BISCUIT_TOKEN, // optional
  timeout: 30000, // optional, default 30s
  headers: {}, // optional custom headers
});
```

### Core Methods

#### Node Information

| Method | Description | Returns |
|--------|-------------|---------|
| `nodeInfo()` | Get local node information | `NodeInfo` |
| `ping()` | Check if node is reachable | `boolean` |
| `waitForReady(options?)` | Wait for node to be ready | `Promise<void>` |

#### Channel Management

| Method | Description | Params |
|--------|-------------|--------|
| `connectPeer(params)` | Connect to a peer | `{ address: Multiaddr, save?: boolean }` |
| `disconnectPeer(params)` | Disconnect from a peer | `{ peer_id: PeerId }` |
| `listPeers()` | List all connected peers | - |
| `openChannel(params)` | Open a new channel | `OpenChannelParams` |
| `acceptChannel(params)` | Accept channel opening | `AcceptChannelParams` |
| `listChannels(params?)` | List all channels | `ListChannelsParams?` |
| `shutdownChannel(params)` | Close a channel | `ShutdownChannelParams` |
| `abandonChannel(params)` | Abandon pending channel | `{ channel_id: ChannelId }` |
| `updateChannel(params)` | Update channel parameters | `UpdateChannelParams` |
| `waitForChannelReady(channelId, options?)` | Wait for channel ready | - |

#### Payment Operations

| Method | Description | Params |
|--------|-------------|--------|
| `sendPayment(params)` | Send a payment | `SendPaymentParams` |
| `getPayment(params)` | Get payment status | `{ payment_hash: PaymentHash }` |
| `waitForPayment(paymentHash, options?)` | Wait for payment completion | - |

#### Invoice Operations

| Method | Description | Params |
|--------|-------------|--------|
| `newInvoice(params)` | Create a new invoice | `NewInvoiceParams` |
| `parseInvoice(params)` | Parse an invoice string | `{ invoice: string }` |
| `getInvoice(params)` | Get invoice by payment hash | `{ payment_hash: PaymentHash }` |
| `cancelInvoice(params)` | Cancel an open invoice | `{ payment_hash: PaymentHash }` |
| `settleInvoice(params)` | Settle a hold invoice | `{ payment_hash, payment_preimage }` |
| `waitForInvoiceStatus(paymentHash, targetStatus, options?)` | Wait for invoice status | - |
| `watchIncomingPayments(options)` | Watch for incoming payments | `{ paymentHashes, onPayment, interval?, signal? }` |

#### Routing

| Method | Description | Params |
|--------|-------------|--------|
| `buildRouter(params)` | Build custom route | `BuildRouterParams` |
| `sendPaymentWithRouter(params)` | Send payment with route | `SendPaymentWithRouterParams` |

#### Graph Queries

| Method | Description | Params |
|--------|-------------|--------|
| `graphNodes(params?)` | List nodes in network | `{ limit?, after? }` |
| `graphChannels(params?)` | List channels in network | `{ limit?, after? }` |

### Additional Classes

#### `LiquidityAnalyzer`

Analyzes channel health and liquidity:

```typescript
import { LiquidityAnalyzer } from '@fiber-pay/sdk';

const analyzer = new LiquidityAnalyzer(client);
const report = await analyzer.analyzeLiquidity();
```

#### `InvoiceVerifier`

Validates invoices before payment:

```typescript
import { InvoiceVerifier } from '@fiber-pay/sdk';

const verifier = new InvoiceVerifier(client);
const result = await verifier.verifyInvoice(invoiceString);
```

#### `PolicyEngine`

Enforces security policies:

```typescript
import { PolicyEngine, DEFAULT_SECURITY_POLICY } from '@fiber-pay/sdk';

const engine = new PolicyEngine(DEFAULT_SECURITY_POLICY);
const check = engine.checkPayment({ amount: "1000" });
```

### Utility Functions

| Function | Description |
|----------|-------------|
| `toHex(value)` | Convert number/bigint to hex |
| `fromHex(hex)` | Convert hex to bigint |
| `ckbToShannons(ckb)` | Convert CKB to shannons |
| `shannonsToCkb(shannons)` | Convert shannons to CKB |
| `randomBytes32()` | Generate random 32-byte hex |
| `nodeIdToPeerId(nodeId)` | Convert node ID to peer ID |
| `buildMultiaddr(address, peerId)` | Build canonical multiaddr |
| `buildMultiaddrFromNodeId(address, nodeId)` | Build multiaddr from node ID |
| `renderBiscuitFactsForMethods(methods)` | Generate Biscuit facts for RPC methods |
| `hashPreimage(preimage, algorithm)` | Compute payment hash from preimage |
| `verifyPreimageHash(preimage, paymentHash, algorithm)` | Verify preimage matches hash |
| `generatePreimage()` | Generate random preimage |
| `ckbHash(data)` | Compute CKB blake2b-256 hash |
| `sha256Hash(data)` | Compute SHA-256 hash |

### Types

Key exported types:

- `HexString`, `Hash256`, `Pubkey`, `Privkey`
- `Channel`, `ChannelState`, `ChannelId`
- `PaymentHash`, `PaymentInfo`, `PaymentStatus`
- `CkbInvoice`, `CkbInvoiceStatus`
- `NodeInfo`, `PeerInfo`
- `SecurityPolicy`, `SpendingLimit`, `RateLimit`
- `InvoiceVerificationResult`
- `LiquidityReport`

## Fiber RPC Fallback

If SDK is unavailable, use direct JSON-RPC calls:

### Example: Get Node Info

```bash
curl -X POST http://localhost:8229 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "node_info",
    "params": [],
    "id": 1
  }'
```

### Common RPC Methods

| Method | Description |
|--------|-------------|
| `node_info` | Get node information |
| `connect_peer` | Connect to a peer |
| `list_peers` | List connected peers |
| `open_channel` | Open payment channel |
| `list_channels` | List channels |
| `new_invoice` | Create invoice |
| `parse_invoice` | Parse invoice string |
| `get_invoice` | Get invoice by hash |
| `send_payment` | Send payment |
| `get_payment` | Get payment status |
| `graph_nodes` | Query network nodes |
| `graph_channels` | Query network channels |

## Local Node Connection

| Property | Value |
|----------|-------|
| Endpoint | `http://localhost:8229` |
| Status | **NOT CONNECTED** |
| Error | Connection refused (HTTP 000) |

### Test Command

```bash
curl -X POST http://localhost:8229 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"node_info","params":[],"id":1}'
```

**Note**: The local Fiber node is not running. Start it with:

```bash
# Example Fiber node startup
fiber-node --config config.yml --rpc-port 8229
```

## Biscuit Authentication

The SDK supports Biscuit tokens for RPC authentication:

```typescript
const client = new FiberRpcClient({
  url: 'http://127.0.0.1:8229',
  biscuitToken: 'your-biscuit-token',
});
```

Generate permission facts for token creation:

```typescript
import { renderBiscuitFactsForMethods } from '@fiber-pay/sdk';

const facts = renderBiscuitFactsForMethods([
  'list_peers',
  'send_payment',
  'get_payment',
]);
// Output:
// read("payments");
// read("peers");
// write("payments");
```

## Recommended Implementation Approach

For the **InvoiceService**, use the SDK approach:

```typescript
import { FiberRpcClient } from '@fiber-pay/sdk';

class InvoiceService {
  private client: FiberRpcClient;
  
  constructor(rpcUrl: string) {
    this.client = new FiberRpcClient({ url: rpcUrl });
  }
  
  async createInvoice(amount: string, description?: string) {
    const result = await this.client.newInvoice({
      amount,
      description,
      currency: 'Fibb', // or 'Fibt' for testnet
    });
    return result.invoice_address;
  }
  
  async getInvoiceStatus(paymentHash: string) {
    const result = await this.client.getInvoice({ payment_hash: paymentHash });
    return result.status;
  }
  
  async parseInvoice(invoiceString: string) {
    const result = await this.client.parseInvoice({ 
      invoice: invoiceString 
    });
    return result.invoice;
  }
}
```

## Important Notes

1. **ESM Only**: The SDK is ES Module only. Use `import` syntax.
2. **HashAlgorithm Mapping**: The SDK handles hash algorithm compatibility across Fiber v0.8.0 RPC variants.
3. **Biscuit Security**: Keep Biscuit tokens server-side; avoid embedding in browser bundles.
4. **Local Node Required**: The SDK requires a running Fiber node at the configured RPC endpoint.

## References

- [Fiber Network Repo](https://github.com/nervosnetwork/fiber)
- [SDK NPM Package](https://www.npmjs.com/package/@fiber-pay/sdk)
- [Fiber RPC Spec](https://github.com/nervosnetwork/fiber/blob/v0.8.0/crates/fiber-lib/src/rpc/README.md)
