# Fiber L402

An L402 payment protocol implementation based on [Fiber Network](https://github.com/nervosnetwork/fiber), including a universal SDK and a paid reading blog example application.

## Project Structure

```text
fiber-l402/
├── packages/
│   └── sdk/             # @fiber-l402/sdk — Universal L402 SDK
├── apps/
│   ├── proxy/           # Paid blog backend (Express, port 3001)
│   └── web/             # Frontend (Astro + React, port 4321)
└── e2e/                 # E2E Tests
```

## L402 SDK (`@fiber-l402/sdk`)

A framework-agnostic L402 protocol SDK that can be used independently of this project. Third-party developers can use it to quickly add payment logic to their APIs.

### Included Modules

| Module | Description |
|------|------|
| **Types** | Type definitions like `Invoice`, `L402Token`, `L402Config`, `ProtectedResourceInfo`, etc. |
| **MacaroonService** | Macaroon minting, verifying, caveat extraction |
| **InvoiceService** | Create/query Fiber Network invoices via `@fiber-pay/sdk` |
| **L402Middleware** | Express middleware to handle 402 challenge and token verification |
| **ResourceResolver** | Resource resolver interface and default Registry implementation |

### Quick Integration

```bash
# After publishing to npm
npm install @fiber-l402/sdk
```

#### 1. Simplest Usage — Protect your Express routes with middleware

```typescript
import express from 'express';
import { createL402Middleware } from '@fiber-l402/sdk';

const app = express();

// Protect route with one line of code
app.get('/api/premium/*', createL402Middleware({
  rootKey: process.env.L402_ROOT_KEY,   // 32-byte hex
  priceCkb: 0.1,                        // Price per request (CKB)
  expirySeconds: 3600,                  // Expiry time
}));

app.get('/api/premium/data', (req, res) => {
  res.json({ secret: 'paid content here' });
});
```

#### 2. Dynamic Pricing based on Resource

```typescript
import { L402Middleware, DefaultResourceResolverRegistry } from '@fiber-l402/sdk';
import type { ResourceResolver, ProtectedResourceInfo } from '@fiber-l402/sdk';

// Implement your own resource resolver
const myResolver: ResourceResolver = {
  name: 'my-resource',
  matches: (req) => req.path.startsWith('/api/data/'),
  resolve: async (req) => ({
    id: req.params.id,
    type: 'dataset',
    priceCkb: 0.5,  // Different prices for each resource
  }),
};

const registry = new DefaultResourceResolverRegistry([myResolver]);

const middleware = new L402Middleware({
  rootKey: process.env.L402_ROOT_KEY,
  resourceResolver: registry,
});

app.get('/api/data/:id', middleware.handle.bind(middleware), handler);
```

#### 3. Independent Usage of Macaroon / Invoice Services

```typescript
import { MacaroonService, InvoiceService } from '@fiber-l402/sdk';

// Macaroon minting and verification
const macaroon = new MacaroonService(process.env.L402_ROOT_KEY);
const { macaroon: token } = macaroon.mint({
  identifier: 'order-123',
  paymentHash: '0x...',
  expirySeconds: 3600,
});
const result = macaroon.verify(token, preimage);

// Invoice creation
const invoice = new InvoiceService({ rpcUrl: 'http://127.0.0.1:8227' });
const inv = await invoice.createInvoice({
  amount: '0x5F5E100',  // 1 CKB
  currency: 'Fibt',
});
```

### Architecture Layering

```text
@fiber-pay/sdk        ← Fiber Network RPC communication
  └─ @fiber-l402/sdk  ← L402 protocol layer (this SDK)
       └─ Your App     ← Business logic
```

## Example Application: Paid Blog

### Environment Variables

Copy `.env.example` → `.env` and configure:

| Variable | Description |
|------|------|
| `L402_ROOT_KEY` | 32-byte hex, used for macaroon signature |
| `ARTICLE_PRICE_CKB` | Article price (default 0.1 CKB) |
| `FIBER_RPC_URL` | Fiber node RPC address |

### Running

```bash
pnpm install
pnpm dev

# Web:   http://localhost:4321
# Proxy: http://localhost:3001
```

### L402 Payment Flow

```text
Request paid content → 402 + macaroon + invoice
                     → User pays via Fiber
                     → Request again with L402 token → 200 returns content
```

## License

MIT
